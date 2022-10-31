provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

locals {
  create_vpc = var.vpc_id == null ? true : false
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.11.0"

  create_vpc = local.create_vpc

  name = var.vpc_name
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway   = true
  enable_vpn_gateway   = true
  enable_dns_support   = true
  enable_dns_hostnames = true

  single_nat_gateway = true

  tags = merge(var.tags, { Terraform = "true" })
}

data "aws_subnets" "private" {
  count = var.vpc_id == "" ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Tier = "Private"
  }
}

data "aws_subnets" "public" {
  count = var.vpc_id ==  "" ? 1 : 0
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

locals {
  vpc = (
    local.create_vpc ?
    {
      id              = module.vpc.vpc_id
      private_subnets = module.vpc.private_subnets
      public_subnets  = module.vpc.public_subnets
    } :
    {
      id              = var.vpc_id
      private_subnets = data.aws_subnets.private[0].ids
      public_subnets  = data.aws_subnets.public[0].ids
    }
  )
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "17.24.0"

  cluster_version        = var.cluster_version
  cluster_name           = var.core_id
  vpc_id                 = local.vpc.id
  subnets                = [local.vpc.private_subnets[0], local.vpc.public_subnets[1]]
  fargate_subnets        = [local.vpc.private_subnets[0]]
  write_kubeconfig       = false
  map_users              = var.kubernetes_users
  tags                   = var.tags

  node_groups = {
    default = {
      desired_capacity = var.node_group_size
      min_capacity     = var.node_group_size
      max_capacity     = (var.node_group_size + 1)

      instance_types = [var.instance_type]
      update_config = {
        max_unavailable_percentage = 50
      }
    }
  }

  fargate_profiles = {


    default = {
      name = "default"
      selectors = [
        {
          namespace = "kube-system"
          labels = {
            k8s-app = "kube-dns"
          }
        },
        {
          namespace = var.namespace
          labels = {
            WorkerType = "fargate"
          }
        }
      ]
    }
  }
  manage_aws_auth = false

}

resource "aws_eks_fargate_profile" "namespaces" {
  count                  = length(var.fargate_profiles)
  cluster_name           = var.core_id
  fargate_profile_name   = "stateless-${var.fargate_profiles[count.index]}"
  pod_execution_role_arn = module.eks.fargate_iam_role_arn
  subnet_ids             = module.vpc.private_subnets
  tags                   = var.tags

  selector {
    namespace = var.fargate_profiles[count.index]
    labels = {
      WorkerType = "fargate"
    }
  }
}

resource "null_resource" "write_kubeconfig_file" {
  triggers = {
    id              = var.core_id
    kubeconfig_path = var.kubeconfig_output_path
    aws_profile     = var.aws_profile
    aws_region      = var.aws_region
  }

  provisioner "local-exec" {
    command = "aws eks update-kubeconfig --name ${self.triggers.id} --alias ${self.triggers.id} --kubeconfig ${self.triggers.kubeconfig_path} --profile ${self.triggers.aws_profile} --region ${self.triggers.aws_region}"
  }

  depends_on = [
    module.eks
  ]
}
