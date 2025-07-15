output "backend_url" {
  description = "URL del Application Load Balancer para el backend."
  value       = aws_alb.app_lb.dns_name
}

output "frontend_s3_bucket_name" {
  description = "Nombre del bucket S3 para el frontend."
  value       = aws_s3_bucket.frontend_bucket.id
}

output "frontend_cloudfront_url" {
  description = "URL de la distribución de CloudFront para el frontend."
  value       = "https://${aws_cloudfront_distribution.s3_distribution.domain_name}"
}

