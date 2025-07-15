# --- Red y Seguridad ---

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "mi-app-vpc"
  }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.aws_region}a"
  map_public_ip_on_launch = true
  tags = {
    Name = "subnet-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}b"
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

# Grupo para la instancia EC2 (permite tráfico SOLO desde el Load Balancer)
resource "aws_security_group" "ec2_sg" {
  name        = "mi-app-ec2-sg"
  description = "Permite trafico desde el LB y la BD"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3001 # Asumiendo que tu app Node.js corre en el puerto 3000
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
    cidr_blocks = ["0.0.0.0/0"]
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
  identifier           = "mi-app-db"
  allocated_storage    = 20
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "14.18"
  instance_class       = "db.t3.micro"      # Parte de la capa gratuita
  db_name              = var.db_name
  username             = var.db_user
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  skip_final_snapshot  = true
  publicly_accessible  = false
}

# --- Backend: Servidor Node.js ---
data "aws_ssm_parameter" "amazon_linux_2" {
  name = "/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2"
}

resource "aws_launch_template" "app_lt" {
  name_prefix   = "mi-app-lt-"
  image_id      = data.aws_ssm_parameter.amazon_linux_2.value
  instance_type = "t2.micro"
  key_name      = "dashboard-clave"
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  user_data = base64encode(<<-EOF
              #!/bin/bash
              # Salir inmediatamente si cualquier comando falla
              set -e

              # 1. Instalar dependencias como root
              yum update -y
              yum install -y git

              # 2. Instalar NVM y Node para el usuario ec2-user
              su - ec2-user -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash"
              su - ec2-user -c "source ~/.nvm/nvm.sh && nvm install 16"

              # 3. Clonar el repositorio
              git clone https://github.com/Roalex86180/proyecto_aws.git /home/ec2-user/app

              # 4. Crear el archivo .env con comandos 'echo' (más fiable)
              echo "PGHOST=${aws_db_instance.app_db.address}" > /home/ec2-user/app/backend/.env
              echo "PGUSER=${var.db_user}" >> /home/ec2-user/app/backend/.env
              echo "PGPASSWORD='${var.db_password}'" >> /home/ec2-user/app/backend/.env
              echo "PGDATABASE=${var.db_name}" >> /home/ec2-user/app/backend/.env
              echo "PGPORT=5432" >> /home/ec2-user/app/backend/.env
              echo "PORT=3001" >> /home/ec2-user/app/backend/.env

              # 5. Cambiar el propietario de todos los archivos de la app a ec2-user
              chown -R ec2-user:ec2-user /home/ec2-user/app

              # 6. Ejecutar la aplicación como ec2-user
              su - ec2-user -c "cd /home/ec2-user/app/backend && source ~/.nvm/nvm.sh && npm install && npm start" > /home/ec2-user/app.log 2>&1 &
              EOF
  )

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
    port     = 3001 # <-- Añade esta línea
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
  vpc_zone_identifier = [aws_subnet.public_a.id, aws_subnet.public_b.id]

  launch_template {
    id      = aws_launch_template.app_lt.id
    version = "$Latest"
  }

  target_group_arns = [aws_alb_target_group.app_tg.arn]
}


# --- Frontend: S3 Bucket para React ---
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "mi-app-react-despliegue-final-unico"
}

# CORRECCIÓN: Configurar Object Ownership para OAC
resource "aws_s3_bucket_ownership_controls" "frontend_bucket_ownership" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# CORRECCIÓN: Bloquear acceso público ya que usaremos OAC
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

# CORRECCIÓN: Agregar OAC para mejor seguridad
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "S3-OAC"
  description                       = "OAC for S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CORRECCIÓN: Solo una política de bucket usando OAC
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
    domain_name = aws_s3_bucket.frontend_bucket.bucket_regional_domain_name
    origin_id   = "S3-Frontend"
    
    # Usar OAC (Origin Access Control) para acceso seguro
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # Origen #2: El backend para la API
  origin {
    domain_name = aws_alb.app_lb.dns_name
    origin_id   = "ALB-Backend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"  # CloudFront -> ALB usa HTTP
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Comportamiento por defecto: Servir desde S3
  default_cache_behavior {
    target_origin_id       = "S3-Frontend"
    viewer_protocol_policy = "redirect-to-https"  # Usuario -> CloudFront usa HTTPS
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    
    forwarded_values {
      query_string = false
      cookies { 
        forward = "none" 
      }
    }
    
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # CORRECCIÓN: Comportamiento para la API con configuración adecuada
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "ALB-Backend"
    viewer_protocol_policy = "https-only"  # Usuario -> CloudFront usa HTTPS
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    
    # CORRECCIÓN: Configuración de forwarded_values para API
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
    
    # CORRECCIÓN: No cachear respuestas de API
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

# Los outputs están definidos en archivo separado