terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Skeleton: production object storage, KMS signing key (R3), and secrets.
# Hosting region is an owner decision (PRD §14). Do not apply until that is set.

variable "region" {
  type    = string
  default = "eu-west-1"
}

provider "aws" {
  region = var.region
}

resource "aws_s3_bucket" "assets" {
  bucket = "oyokometa-assets"
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_kms_key" "signing" {
  description              = "Oyokometa ECDSA P-256 provenance signing (R3)"
  customer_master_key_spec = "ECC_NIST_P256"
  key_usage                = "SIGN_VERIFY"
}
