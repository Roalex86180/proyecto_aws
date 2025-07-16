# --- Red y Seguridad ---

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "mi-app-vpc"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags = {
    Name = "subnet-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true
  tags = {
    Name = "subnet-public-b"
  }
}

resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}a"
  tags = {
    Name = "subnet-private-a"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "${var.aws_region}b"
  tags = {
    Name = "subnet-private-b"
  }
}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "mi-app-igw"
  }
}

resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public_rt.id
}


# --- Grupos de Seguridad (Firewalls Virtuales) ---

# Grupo para el Load Balancer (permite tráfico web)
resource "aws_security_group" "lb_sg" {
  name        = "mi-app-lb-sg"
  description = "Permite trafico HTTP desde cualquier lugar"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Grupo para la instancia EC2 (permite tráfico SOLO desde el Load Balancer y SSH)
resource "aws_security_group" "ec2_sg" {
  name        = "mi-app-ec2-sg"
  description = "Permite trafico desde el LB y la BD"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3001 # Asumiendo que tu app Node.js corre en el puerto 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.lb_sg.id] # Solo permite trafico del LB
  }

    # Regla para permitir SSH desde tu IP
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["181.42.177.187/32"] # Reemplaza con tu IP pública
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"] # Permite tráfico saliente a cualquier lugar (incluido RDS)
  }
}

# Grupo para la Base de Datos (permite tráfico SOLO desde la EC2)
resource "aws_security_group" "rds_sg" {
  name        = "mi-app-rds-sg"
  description = "Permite trafico desde la instancia EC2"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432 # Puerto de PostgreSQL
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_sg.id] # Solo permite trafico de la EC2
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}



# --- Backend: Base de Datos RDS PostgreSQL ---

resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "mi-app-rds-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_db_instance" "app_db" {
  identifier            = "mi-app-db"
  allocated_storage     = 20
  storage_type          = "gp2"
  engine                = "postgres"
  engine_version        = "14.18"
  instance_class        = "db.t3.micro"       # capa gratuita
  db_name               = var.db_name
  username              = var.db_user
  password              = var.db_password
  db_subnet_group_name  = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot   = true
  publicly_accessible   = false
}


# --- S3 Bucket para el Dump de la DB ---
resource "aws_s3_bucket" "database_dumps_bucket" {
  bucket = "mi-app-db-dumps-unique-${random_string.dump_suffix.result}" # Nombre único

  tags = {
    Name = "mi-app-db-dumps"
  }
}

resource "random_string" "dump_suffix" {
  length  = 8
  special = false
  upper   = false
}

# IAM Role para que la EC2 pueda leer del bucket S3
resource "aws_iam_role" "ec2_s3_access_role" {
  name = "mi-app-ec2-s3-access-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })

  tags = {
    Name = "EC2 S3 Access Role"
  }
}

resource "aws_iam_role_policy" "ec2_s3_read_policy" {
  name = "mi-app-ec2-s3-read-policy"
  role = aws_iam_role.ec2_s3_access_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Effect   = "Allow"
        Resource = [
          aws_s3_bucket.database_dumps_bucket.arn,
          "${aws_s3_bucket.database_dumps_bucket.arn}/*",
        ]
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2_s3_profile" {
  name = "mi-app-ec2-s3-profile"
  role = aws_iam_role.ec2_s3_access_role.name

  tags = {
    Name = "EC2 S3 Instance Profile"
  }
}



# --- Backend: Servidor Node.js (Launch Template, ALB, ASG) ---
data "aws_ssm_parameter" "amazon_linux_2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64"
}

# Este es el ÚNICO y CORRECTO bloque aws_launch_template
resource "aws_launch_template" "app_lt" {
  name_prefix   = "mi-app-lt-"
  image_id      = data.aws_ssm_parameter.amazon_linux_2023.value
  instance_type = "t2.micro"
  key_name      = "dashboard-clave"
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  # Asigna el perfil de instancia IAM para acceso a S3
  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_s3_profile.name
  }

  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_host        = aws_db_instance.app_db.address
    db_user        = var.db_user
    db_password    = var.db_password
    db_name        = var.db_name
    s3_dump_bucket = aws_s3_bucket.database_dumps_bucket.id # Pasa el nombre del bucket al user_data
    s3_dump_key    = "entelrm_backup.sql" # Nombre del archivo dentro del bucket
    DUMP_FILE      = "/tmp/entelrm_backup.sql"
  }))

  tags = {
    Name = "mi-app-template"
  }
}

resource "aws_alb" "app_lb" {
  name               = "mi-app-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
}

resource "aws_alb_target_group" "app_tg" {
    name     = "mi-app-tg"
    port     = 3001
    protocol = "HTTP"
    vpc_id   = aws_vpc.main.id
  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
  }
}

resource "aws_alb_listener" "http" {
  load_balancer_arn = aws_alb.app_lb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.app_tg.arn
  }
}

resource "aws_autoscaling_group" "app_asg" {
  name                = "mi-app-asg"
  desired_capacity    = 1
  max_size            = 2
  min_size            = 1
  vpc_zone_identifier = [aws_subnet.public_a.id]

  launch_template {
    id      = aws_launch_template.app_lt.id
    version = "$Latest"
  }

  target_group_arns = [aws_alb_target_group.app_tg.arn]
}



# --- Provisioner para subir el dump a S3 (opcional pero muy útil) ---
resource "null_resource" "upload_dump_to_s3" {
  # Este provisioner sólo se ejecutará si el archivo del dump cambia
  # o si el bucket de S3 se recrea.
  triggers = {
    dump_md5  = filemd5("${path.module}/entelrm_backup.sql")
    bucket_id = aws_s3_bucket.database_dumps_bucket.id
  }

  provisioner "local-exec" {
    command = "aws s3 cp ${path.module}/entelrm_backup.sql s3://${aws_s3_bucket.database_dumps_bucket.id}/entelrm_backup.sql"
    # Asegúrate de tener las credenciales de AWS configuradas en tu máquina local
    # (ej. aws configure o variables de entorno AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  }
  # Depende del bucket S3 para asegurar que exista antes de intentar subir
  depends_on = [aws_s3_bucket.database_dumps_bucket]
}



# --- Frontend: S3 Bucket para React ---
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "mi-app-react-despliegue-final-unico"
}

# Configurar Object Ownership para OAC
resource "aws_s3_bucket_ownership_controls" "frontend_bucket_ownership" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Bloquear acceso público ya que usaremos OAC
resource "aws_s3_bucket_public_access_block" "frontend_bucket_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  depends_on = [aws_s3_bucket_ownership_controls.frontend_bucket_ownership]
}

resource "aws_s3_bucket_website_configuration" "frontend_website_config" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"  # Para SPA routing
  }
}

# Agregar OAC para mejor seguridad
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                          = "S3-OAC"
  description                   = "OAC for S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior              = "always"
  signing_protocol              = "sigv4"
}

# Solo una política de bucket usando OAC
resource "aws_s3_bucket_policy" "cloudfront_oac_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id

  depends_on = [
    aws_s3_bucket_ownership_controls.frontend_bucket_ownership,
    aws_s3_bucket_public_access_block.frontend_bucket_access,
    aws_cloudfront_origin_access_control.s3_oac
  ]

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "cloudfront.amazonaws.com"
        },
        Action   = "s3:GetObject",
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*",
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.s3_distribution.arn
          }
        }
      }
    ]
  })
}


# --- Frontend: CloudFront para servir el contenido y la API ---
resource "aws_cloudfront_distribution" "s3_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # Origen #1 (por defecto): El bucket S3 con la UI
  origin {
    domain_name              = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id                = "S3-Frontend"

    # Usar OAC (Origin Access Control) para acceso seguro
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # Origen #2: El backend para la API
  origin {
    domain_name = aws_alb.app_lb.dns_name
    origin_id   = "ALB-Backend"

    custom_origin_config {
      http_port            = 80
      https_port           = 443
      origin_protocol_policy = "http-only"   # CloudFront -> ALB usa HTTP
      origin_ssl_protocols = ["TLSv1.2"]
    }
  }

  # Comportamiento por defecto: Servir desde S3
  default_cache_behavior {
    target_origin_id       = "S3-Frontend"
    viewer_protocol_policy = "redirect-to-https"   # Usuario -> CloudFront usa HTTPS
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
    compress    = true
  }

  # Comportamiento para la API con configuración adecuada
  ordered_cache_behavior {
    path_pattern         = "/api/*"
    target_origin_id       = "ALB-Backend"
    viewer_protocol_policy = "https-only"   # Usuario -> CloudFront usa HTTPS
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]

    # Configuración de forwarded_values para API
    forwarded_values {
      query_string = true
      headers      = [
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "Referer",
        "User-Agent"
      ]
      cookies {
        forward = "all"
      }
    }

    # No cachear respuestas de API
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
    compress    = true
  }

  # Páginas de error personalizadas para SPA
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "Frontend Distribution"
  }
}