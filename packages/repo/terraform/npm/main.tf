variable "common" {}
variable "root" { type = string }

data "external" "git_checkout" {
  program = ["${abspath("${path.module}")}/get-sha.sh"]
}

locals {
  npm      = jsondecode(file("${var.root}/package.json"))
  revision = data.external.git_checkout.result.sha
}

locals {
  npm_ident     = replace(replace(local.npm.name, "/^@.+\\//", ""), "/\\//", "-")
  npm_pkg_ident = replace(replace(local.npm.name, "/^@/", ""), "/\\//", "-")
}

locals {
  npm_version = var.common.production ? local.npm.version : "${local.npm.version}+${local.revision}"
  zip_name    = "${local.npm_pkg_ident}.zip"
}

output "artifact_name" {
  value = "${local.npm_pkg_ident}-${local.npm_version}.zip"
}

output "description" {
  value = local.npm.description
}

output "dist_dir" {
  value = "${var.common.dist_dir}/${local.npm_pkg_ident}"
}

output "ident" {
  value = "${terraform.workspace}-${local.npm_ident}"
}

output "ident_url" {
  value = "${terraform.workspace}/${local.npm_ident}"
}

output "docker_image_name" {
  value = "${local.npm_pkg_ident}:${local.revision}"
}

output "pkg_ident" {
  value = local.npm_pkg_ident
}

output "name" {
  value = local.npm_ident
}

output "revision" {
  value = local.revision
}

output "version" {
  value = local.npm_version
}

output "zip_name" {
  value = local.zip_name
}

output "zip_path" {
  value = "${var.common.dist_dir}/${local.zip_name}"
}
