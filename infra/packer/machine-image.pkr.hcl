packer {
  required_plugins {
    # amazon-ebs = {
    #   source  = "github.com/hashicorp/amazon"
    #   version = ">= 1.0.0"
    # }
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = ">= 1.0.0"
    }
  }
}
 
variable "aws_region" {
  type    = string
  default = "us-east-1"
}
 
variable "ubuntu_24_04_amis" {
  type = map(string)
  default = {
    # North America
    "us-east-1"      = "ami-0609a4e88e9e5a526" # N. Virginia
    "us-east-2"      = "ami-08fdd91f87e57b0bb" # Ohio
    "us-west-1"      = "ami-061d92fa63070a0e8" # N. California
    "us-west-2"      = "ami-0c3e85c99e9acddd4" # Oregon
    "ca-central-1"   = "ami-0abb5e0e84f407887" # Canada (Central)
    
    # South America
    "sa-east-1"      = "ami-0fb449eb6a9cb0a56" # São Paulo
    
    # Europe
    "eu-central-1"   = "ami-06dd92edc0c9af88a" # Frankfurt
    "eu-west-1"      = "ami-06d0b5f4ea60cbfbe" # Ireland
    "eu-west-2"      = "ami-0ab14128a099b8fb5" # London
    "eu-west-3"      = "ami-0e3e79b2e8465f9ba" # Paris
    "eu-north-1"     = "ami-0989fb15ce71ba272" # Stockholm
    "eu-south-1"     = "ami-09a6c6afbbea22569" # Milan
    
    # Asia Pacific
    "ap-east-1"      = "ami-0a77bf3d04529b032" # Hong Kong
    "ap-southeast-1" = "ami-0fb9d1d1507aff94a" # Singapore
    "ap-southeast-2" = "ami-0df541cb9e45d56dd" # Sydney
    "ap-northeast-1" = "ami-03b1d0352a8ee678d" # Tokyo
    "ap-northeast-2" = "ami-0b68cede686a3ffc8" # Seoul
    "ap-northeast-3" = "ami-02a823cd79ae77487" # Osaka
    "ap-south-1"     = "ami-0d80a22fcdf0ea6d8" # Mumbai
    
    # Middle East
    "me-south-1"     = "ami-0cd92fa0f39c9b2d2" # Bahrain
    
    # Africa
    "af-south-1"     = "ami-0d1a5fd7a3a1cc73a" # Cape Town
  }
}

# Default fallback AMI if region not found in map
variable "aws_source_ami" {
  type    = string
  default = "ami-0609a4e88e9e5a526" // Ubuntu 24.04 LTS
}

# Automatically select AMI based on region
locals {
  ami_id = lookup(var.ubuntu_24_04_amis, var.aws_region, var.aws_source_ami)
}
 
variable "instance_type" {
  type    = string
  default = "t2.micro"
}
 
variable "demo_account_id" {
  type        = string
  default     = ""
  description = "AWS account ID to share the AMI with"
}
 
variable "gcp_project_id" {
  type        = string
  default     = "avian-destiny-452100-j9"
  description = "GCP DEV project ID"
}
 
variable "gcp_demo_project_id" {
  type        = string
  default     = ""
  description = "GCP DEMO project ID to share the image with"
}
 
variable "gcp_source_image" {
  type    = string
  default = "ubuntu-2404-noble-amd64-v20250214"
}
 
variable "gcp_zone" {
  type    = string
  default = "us-east1-b"
}
 
variable "gcp_machine_type" {
  type    = string
  default = "e2-medium"
}
 
variable "gcp_storage_location" {
  type    = string
  default = "us"
}
 
# # AWS AMI Build
# source "amazon-ebs" "ubuntu" {
#   region                      = var.aws_region
#   source_ami                  = local.ami_id
#   instance_type               = var.instance_type
#   ssh_username                = "ubuntu"
#   ami_name                    = "custom-nodejs-mysql-{{timestamp}}"
#   ami_description             = "Custom image with Node.js binary and MySQL"
#   associate_public_ip_address = true
#   ssh_timeout                 = "10m"
# }
 
# GCP Image Build
source "googlecompute" "ubuntu" {
  project_id           = var.gcp_project_id
  source_image         = var.gcp_source_image
  machine_type         = var.gcp_machine_type
  zone                 = var.gcp_zone
  image_name           = "custom-nodejs-mysql-{{timestamp}}"
  image_family         = "custom-images"
  image_description    = "Custom GCP image with Node.js and MySQL"
  ssh_username         = "ubuntu"
  wait_to_add_ssh_keys = "10s"
}
 
build {
  sources = [
    # "source.amazon-ebs.ubuntu",
    "source.googlecompute.ubuntu"
  ]
 
  provisioner "file" {
    source      = "dist/webapp" 
    destination = "/tmp/webapp"
  }
 
  provisioner "file" {
    source      = "setup.sh"
    destination = "/tmp/setup.sh"
  }
 
  provisioner "file" {
    source      = "webapp.service"
    destination = "/tmp/webapp.service"
  }
 
  provisioner "shell" {
    inline = [
      "chmod +x /tmp/setup.sh",
      "sudo /tmp/setup.sh"
    ]
  }
}