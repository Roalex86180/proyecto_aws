variable "aws_region" {
  description = "La región de AWS donde se crearán los recursos."
  type        = string
  default     = "sa-east-1"
}

variable "db_name" {
  description = "Nombre de la base de datos"
  type        = string
  default     = "entelrm"
}

variable "db_user" {
  description = "Usuario para la base de datos"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Contraseña para la base de datos"
  type        = string
  sensitive   = true # Oculta el valor en los logs
}