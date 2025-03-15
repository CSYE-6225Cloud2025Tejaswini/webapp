# Required Packer block
packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = ">= 1.1.3"
    }
  }
}

# Define timestamp variable for unique image names
locals {
  timestamp = formatdate("YYYYMMDD-hhmmss", timestamp())
}

variable "ami_base" {
  description = "Base Ubuntu AMI ID"
  default     = ""
}

variable "vpc_identifier" {
  description = "VPC where the instance will be launched"
  default     = ""
}

variable "subnet_identifier" {
  description = "Subnet where the instance will be launched"
  default     = ""
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_source_ami" {
  type    = string
  default = "ami-0609a4e88e9e5a673" // Ubuntu 24.04 LTS
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "demo_account_id" {
  type        = string
  default     = "559050238253"
  description = "AWS account ID to share the AMI with"
}

variable "gcp_project_id" {
  type        = string
  default     = "avian-destiny-452100-j9"
  description = "GCP DEV project ID"
}

variable "gcp_demo_project_id" {
  type        = string
  default     = "sonorous-charge-452100-g8"
  description = "GCP DEMO project ID to share the image with"
}

variable "gcp_source_image" {
  type    = string
  default = "ubuntu-2404-noble-amd64-v20250214"
}

variable "gcp_zone" {
  type    = string
  default = "us-east1-b"
}

variable "gcp_machine_type" {
  type    = string
  default = "e2-medium"
}

variable "gcp_storage_location" {
  type    = string
  default = "us"
}

# Configure AWS provider
source "amazon-ebs" "ubuntu_image" {
  region                      = var.aws_region
  source_ami                  = var.aws_source_ami
  instance_type               = var.instance_type
  ssh_username                = "ubuntu"
  ami_name                    = "custom-ubuntu-image-${local.timestamp}"
  subnet_id                   = var.subnet_identifier
  vpc_id                      = var.vpc_identifier
  associate_public_ip_address = true

  tags = {
    Name        = "Packer-Built-Ubuntu"
    Environment = "Dev"
    Timestamp   = local.timestamp
  }
}

# GCP Image Build
source "googlecompute" "ubuntu" {
  project_id           = var.gcp_project_id
  source_image         = var.gcp_source_image
  machine_type         = var.gcp_machine_type
  zone                 = var.gcp_zone
  image_name           = "custom-nodejs-mysql-${local.timestamp}"
  image_family         = "custom-images"
  image_description    = "Custom GCP image with Node.js and MySQL"
  ssh_username         = "ubuntu"
  wait_to_add_ssh_keys = "10s"
}

# Provision the VM with necessary software and configurations
build {
  sources = ["source.amazon-ebs.ubuntu_image", "source.googlecompute.ubuntu"]

  provisioner "file" {
    source      = "../../application.zip"
    destination = "/tmp/application.zip"
    generated   = true
  }

  provisioner "file" {
    source      = "../../.env"
    destination = "/tmp/.env"
    generated   = true
  }

  provisioner "file" {
    source      = "webapp.service"
    destination = "/tmp/webapp.service"
  }

  provisioner "shell" {
    script = "setup.sh"
  }
}