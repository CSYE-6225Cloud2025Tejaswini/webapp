packer {
  required_plugins {
    amazon-ebs = {
      source  = "github.com/hashicorp/amazon"
      version = ">= 1.0.0"
    }
    googlecompute = {
      source  = "github.com/hashicorp/googlecompute"
      version = ">= 1.0.0"
    }
  }
}

variable "cloud_territory" {
  type    = string
  default = "us-east-1"
}

variable "noble_system_identifiers" {
  type = map(string)
  default = {
    "us-east-1"      = "ami-0609a4e88e9e5a526" # Eastern Territory
    "us-east-2"      = "ami-08fdd91f87e57b0bb" # Midwest Territory
    "us-west-1"      = "ami-061d92fa63070a0e8" # Western Coast North
    "us-west-2"      = "ami-0c3e85c99e9acddd4" # Pacific Northwest
    "ca-central-1"   = "ami-0abb5e0e84f407887" # Northern Neighbor
    "sa-east-1"      = "ami-0fb449eb6a9cb0a56" # Southern Continent
    "eu-central-1"   = "ami-06dd92edc0c9af88a" # Central Europe
    "eu-west-1"      = "ami-06d0b5f4ea60cbfbe" # Atlantic Island
    "eu-west-2"      = "ami-0ab14128a099b8fb5" # Island Kingdom
    "eu-west-3"      = "ami-0e3e79b2e8465f9ba" # Western Europe
    "eu-north-1"     = "ami-0989fb15ce71ba272" # Nordic Region
    "eu-south-1"     = "ami-09a6c6afbbea22569" # Mediterranean Peninsula
    "ap-east-1"      = "ami-0a77bf3d04529b032" # Eastern Harbor
    "ap-southeast-1" = "ami-0fb9d1d1507aff94a" # Lion City
    "ap-southeast-2" = "ami-0df541cb9e45d56dd" # Down Under
    "ap-northeast-1" = "ami-03b1d0352a8ee678d" # Land of Rising Sun
    "ap-northeast-2" = "ami-0b68cede686a3ffc8" # Peninsula Nation
    "ap-northeast-3" = "ami-02a823cd79ae77487" # Kansai Area
    "ap-south-1"     = "ami-0d80a22fcdf0ea6d8" # Subcontinental Region
    "me-south-1"     = "ami-0cd92fa0f39c9b2d2" # Gulf State
    "af-south-1"     = "ami-0d1a5fd7a3a1cc73a" # Southern Tip
  }
}

variable "backup_system_reference" {
  type    = string
  default = "ami-0609a4e88e9e5a526" # Noble LTS OS
}

locals {
  system_reference = lookup(var.noble_system_identifiers, var.cloud_territory, var.backup_system_reference)
}

variable "vm_classification" {
  type    = string
  default = "t2.micro"
}

variable "stage_account_identifier" {
  type        = string
  default     = ""
  description = "Cloud account ID to share the created system with"
}

variable "gcp_source_env_id" {
  type        = string
  default     = "avian-destiny-452100-j9"
  description = "GCP primary environment identifier"
}

variable "gcp_stage_env_id" {
  type        = string
  default     = ""
  description = "GCP secondary environment ID for system sharing"
}

variable "gcp_base_system" {
  type    = string
  default = "ubuntu-2404-noble-amd64-v20250214"
}

variable "gcp_location_code" {
  type    = string
  default = "us-east1-b"
}

variable "gcp_resource_size" {
  type    = string
  default = "e2-medium"
}

variable "gcp_backup_region" {
  type    = string
  default = "us"
}

# AWS System Creation
source "amazon-ebs" "ubuntu" {
  region                      = var.cloud_territory
  source_ami                  = local.system_reference
  instance_type               = var.vm_classification
  ssh_username                = "ubuntu"
  ami_name                    = "custom-nodejs-mysql-{{timestamp}}"
  ami_description             = "Custom image with Node.js binary and MySQL"
  associate_public_ip_address = true
  ssh_timeout                 = "10m"
#  ami_user                    = "559050238253"
}

# GCP System Creation
source "googlecompute" "ubuntu" {
  project_id           = var.gcp_source_env_id
  source_image         = var.gcp_base_system
  machine_type         = var.gcp_resource_size
  zone                 = var.gcp_location_code
  image_name           = "custom-nodejs-mysql-{{timestamp}}"
  image_family         = "custom-images"
  image_description    = "Custom GCP image with Node.js and MySQL"
  ssh_username         = "ubuntu"
  wait_to_add_ssh_keys = "10s"
}

build {
  sources = [
    "amazon-ebs.ubuntu",
    "googlecompute.ubuntu"
  ]

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