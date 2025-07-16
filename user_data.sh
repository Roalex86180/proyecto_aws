#!/bin/bash
# Logging para debugging
exec > >(tee /var/log/user-data.log)
exec 2>&1

set -e

echo "Iniciando configuración de la instancia..."

# 1. Instalar dependencias
dnf update -y # Para Amazon Linux 2023, usar dnf

# Instalar herramientas de PostgreSQL (el paquete 'postgresql' suele incluir 'psql'), Git, y AWS CLI usando dnf.
dnf search postgresql || true
dnf install -y git postgresql15 aws-cli || dnf install -y git postgresql postgresql-server aws-cli # <--- ¡CAMBIADO 'postgresql-client' a 'postgresql'!
# Si 'postgresql' no incluye el cliente psql (raro) o necesitas otras herramientas, podrías intentar 'postgresql-server' o 'libpq-devel'.

# 2. Instalar NVM y Node
echo "Instalando NVM y Node.js..."
# Ejecuta el script de instalación de NVM directamente como ec2-user.
# Esto asegura que NVM se instale en /home/ec2-user/.nvm
su - ec2-user -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash"

# AHORA, para asegurarnos de que NVM se cargue en todas las shells de 'ec2-user'
# Añadimos las líneas a .bashrc de forma explícita si el instalador falló en encontrarlo.
# Verificar si las líneas ya existen antes de añadirlas para evitar duplicados.
if ! grep -q 'export NVM_DIR="$HOME/.nvm"' /home/ec2-user/.bashrc; then
  echo 'export NVM_DIR="$HOME/.nvm"' >> /home/ec2-user/.bashrc
fi
if ! grep -q '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' /home/ec2-user/.bashrc; then
  echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> /home/ec2-user/.bashrc
fi
if ! grep -q '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' /home/ec2-user/.bashrc; then
  echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> /home/ec2-user/.bashrc
fi

# Instalar Node.js para ec2-user: Usando Node 20 (compatible con AL2023 y tus dependencias)
su - ec2-user -c "source /home/ec2-user/.bashrc && nvm install 20 && nvm use 20"
# Opcional: para que Node 20 sea la versión por defecto para nuevas shells:
# su - ec2-user -c "source /home/ec2-user/.bashrc && nvm alias default 20"

# 3. Clonar repositorio y organizar directorios
echo "Clonando repositorio..."
# Crea el directorio base para tu app y asegura permisos
mkdir -p /home/ec2-user/app
chown ec2-user:ec2-user /home/ec2-user/app

# Clonar el repositorio. Se clonará como /home/ec2-user/app/proyecto_aws
git clone https://github.com/Roalex86180/proyecto_aws.git /home/ec2-user/app/proyecto_aws

# Mueve el contenido de 'backend' y 'frontend' un nivel arriba (a /home/ec2-user/app)
# Verifica primero que estos directorios existen dentro de 'proyecto_aws' antes de mover
if [ -d "/home/ec2-user/app/proyecto_aws/backend" ]; then
    mv /home/ec2-user/app/proyecto_aws/backend /home/ec2-user/app/
fi
if [ -d "/home/ec2-user/app/proyecto_aws/frontend" ]; then
    mv /home/ec2-user/app/proyecto_aws/frontend /home/ec2-user/app/
fi

# Elimina el directorio raíz del repositorio clonado (proyecto_aws)
# Usa -f para forzar la eliminación sin preguntar y sin error si no existe
rm -rf /home/ec2-user/app/proyecto_aws

# Asegura que los directorios finales 'backend' y 'frontend' sean propiedad de ec2-user
chown -R ec2-user:ec2-user /home/ec2-user/app/backend
chown -R ec2-user:ec2-user /home/ec2-user/app/frontend


# 4. Crear archivo .env (el path ahora es /home/ec2-user/app/backend/.env)
echo "Creando archivo .env..."
cat > /home/ec2-user/app/backend/.env << EOF
PGHOST=${db_host}
PGUSER=${db_user}
PGPASSWORD='${db_password}'
PGDATABASE=${db_name}
PGPORT=5432
PORT=3001
EOF

chown ec2-user:ec2-user /home/ec2-user/app/backend/.env

# 5. Función para esperar que RDS esté disponible
wait_for_db() {
    echo "Esperando que la base de datos esté disponible..."
    local max_attempts=30
    local attempt=1

    # Asegúrate de que las dependencias de pg estén instaladas para el script de Node
    # Asegúrate que el path es correcto: /home/ec2-user/app/backend
    su - ec2-user -c "cd /home/ec2-user/app/backend && source /home/ec2-user/.bashrc && npm install pg"

    while [ $attempt -le $max_attempts ]; do
        if su - ec2-user -c "cd /home/ec2-user/app/backend && source /home/ec2-user/.bashrc && node -e \"
            const { Client } = require('pg');
            const client = new Client({
                host: '${db_host}',
                user: '${db_user}',
                password: '${db_password}',
                database: '${db_name}',
                port: 5432,
                ssl: { rejectUnauthorized: false }
            });
            client.connect().then(() => {
                console.log('Database connected');
                client.end();
                process.exit(0);
            }).catch(err => {
                console.log('Connection failed:', err.message);
                process.exit(1);
            });
        \""; then
            echo "Base de datos disponible!"
            return 0
        fi

        echo "Intento $attempt/$max_attempts fallido. Esperando 10 segundos..."
        sleep 10
        ((attempt++))
    done

    echo "Error: No se pudo conectar a la base de datos después de $max_attempts intentos"
    return 1
}

# 6. Instalar dependencias de la aplicación (esto debe ir antes de wait_for_db si el script de wait usa pg)
echo "Instalando dependencias de la aplicación Node.js..."
# Asegúrate que el path es correcto: /home/ec2-user/app/backend
su - ec2-user -c "cd /home/ec2-user/app/backend && source /home/ec2-user/.bashrc && npm install"

# 7. Lógica de Migración del Dump (¡Usando S3!)
# DUMP_FILE, s3_dump_bucket, s3_dump_key vienen como variables de plantilla desde main.tf

# Esperar que la DB esté disponible antes de migrar
if wait_for_db; then
    echo "Base de datos disponible. Procediendo con la migración del dump."

    # Verificar que el archivo existe en S3
    echo "Verificando que el dump existe en S3..."
    if ! aws s3 ls s3://${s3_dump_bucket}/${s3_dump_key} > /dev/null 2>&1; then
        echo "ERROR: El archivo ${s3_dump_key} no existe en el bucket ${s3_dump_bucket}"
        exit 1
    fi

    # Obtener información del archivo
    DUMP_INFO=$(aws s3 ls s3://${s3_dump_bucket}/${s3_dump_key} --human-readable)
    echo "Información del dump: $DUMP_INFO"

    # Restaurar directamente desde S3 sin descarga temporal (streaming)
    export PGPASSWORD='${db_password}'
    echo "Iniciando restauración de la base de datos directamente desde S3..."

    # Verificar si el archivo está comprimido
    if [[ "${s3_dump_key}" == *.gz ]]; then
        echo "Detectado archivo comprimido. Descomprimiendo en streaming..."
        if aws s3 cp s3://${s3_dump_bucket}/${s3_dump_key} - | gunzip | psql -h "${db_host}" -U "${db_user}" -d "${db_name}"; then
            echo "Base de datos restaurada exitosamente usando streaming desde S3 (archivo comprimido)."
        else
            echo "Error al restaurar la base de datos desde archivo comprimido."
            exit 1
        fi
    else
        echo "Procesando archivo SQL directamente..."
        if aws s3 cp s3://${s3_dump_bucket}/${s3_dump_key} - | psql -h "${db_host}" -U "${db_user}" -d "${db_name}"; then
            echo "Base de datos restaurada exitosamente usando streaming desde S3."
        else
            echo "Error al restaurar la base de datos."
            exit 1
        fi
    fi

    # Iniciar la aplicación
    echo "Iniciando aplicación Node.js..."
    su - ec2-user -c "cd /home/ec2-user/app/backend && source /home/ec2-user/.bashrc && npm start" > /home/ec2-user/app/backend/app.log 2>&1 &
    echo "Aplicación iniciada."
else
    echo "Error: No se pudo conectar a la base de datos. Abortando la configuración."
    exit 1
fi