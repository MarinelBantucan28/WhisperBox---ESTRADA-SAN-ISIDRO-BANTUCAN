# Dockerfile for WhisperBox backend (Cloud Run compatible)
FROM php:8.2-apache

# Install system deps and PHP extensions required (pdo_mysql, fileinfo, gd)
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-configure gd --with-jpeg \
    && docker-php-ext-install pdo_mysql gd mbstring

# Install composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy application
WORKDIR /var/www/html
COPY . /var/www/html/

# Ensure permissions
RUN chown -R www-data:www-data /var/www/html

# Expose port used by Cloud Run
EXPOSE 8080

# Configure Apache to listen on $PORT (Cloud Run sets PORT environment variable)
RUN sed -i 's/80/8080/g' /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf

# Start Apache
CMD ["apache2-foreground"]
