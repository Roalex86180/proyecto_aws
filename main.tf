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
  image_id      = data.aws_ssm_parameter.amazon_linux_2.value # ID dinámico y correcto para tu región
  instance_type = "t2.micro"             # Parte de la capa gratuita
  key_name      = "dashboard-clave" # IMPORTANTE: Reemplaza con tu key pair
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  user_data = base64encode(<<-EOF
              #!/bin/bash
              # Actualizamos e INSTALAMOS GIT
              yum update -y
              yum install -y git

              # Instalamos NVM y Node.js para el usuario ec2-user
              su - ec2-user -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash"
              su - ec2-user -c "source ~/.nvm/nvm.sh && nvm install 18"

              # Clonamos el repositorio como ec2-user
              su - ec2-user -c "git clone https://github.com/Roalex86180/proyecto_aws.git /home/ec2-user/app"

              # Instalamos dependencias y configuramos variables
              # Nota: La contraseña se maneja de forma segura
              export DB_HOST=${aws_db_instance.app_db.address}
              export DB_USER=${var.db_user}
              export DB_PASSWORD='${var.db_password}'
              export DB_NAME=${var.db_name}
              export PORT=3001

              # Creamos un script para iniciar la app y lo ejecutamos como ec2-user
              cat <<'EOT' > /home/ec2-user/run_app.sh
              #!/bin/bash
              source /home/ec2-user/.nvm/nvm.sh
              export DB_HOST=${aws_db_instance.app_db.address}
              export DB_USER=${var.db_user}
              export DB_PASSWORD='${var.db_password}'
              export DB_NAME=${var.db_name}
              export PORT=3001
              cd /home/ec2-user/app
              npm install
              npm start
              EOT

              chown ec2-user:ec2-user /home/ec2-user/run_app.sh
              chmod +x /home/ec2-user/run_app.sh

              su - ec2-user -c "/home/ec2-user/run_app.sh > /home/ec2-user/app.log 2>&1 &"

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

output "backend_url" {
  description = "URL del Application Load Balancer para el backend."
  value       = aws_alb.app_lb.dns_name
}