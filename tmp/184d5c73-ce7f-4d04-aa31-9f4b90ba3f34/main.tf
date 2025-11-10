# main.tf
provider "azurerm" {
  features {}
}

# Create the target resource group
resource "azurerm_resource_group" "target" {
  name     = var.target_resource_group_name
  location = var.location

  tags = {
    environment = "test"
  }
}

# Clone the first Cognitive Services account
resource "azurerm_cognitive_account" "azure_openai_learn" {
  name                = "azure-openai-learn"
  resource_group_name = azurerm_resource_group.target.name
  location            = var.location
  kind                = "OpenAI"
  sku_name            = "S0"

  tags = {
    env = "dev"
  }

  depends_on = [azurerm_resource_group.target]
}

# Clone the second Cognitive Services account
resource "azurerm_cognitive_account" "kushw_mfuvtebz_eastus2" {
  name                = "kushw-mfuvtebz-eastus2"
  resource_group_name = azurerm_resource_group.target.name
  location            = "eastus2" # Note: This resource has a different location
  kind                = "AIServices"
  sku_name            = "S0"

  tags = {}

  depends_on = [azurerm_resource_group.target]
}

# variables.tf
variable "target_resource_group_name" {
  description = "The name of the target resource group to create."
  type        = string
  default     = "demoai-tests"
}

variable "location" {
  description = "The location for the target resource group."
  type        = string
  default     = "eastus"
}

# outputs.tf
output "resource_group_name" {
  description = "The name of the created resource group."
  value       = azurerm_resource_group.target.name
}

output "azure_openai_learn_id" {
  description = "The ID of the cloned azure-openai-learn Cognitive Services account."
  value       = azurerm_cognitive_account.azure_openai_learn.id
}

output "kushw_mfuvtebz_eastus2_id" {
  description = "The ID of the cloned kushw-mfuvtebz-eastus2 Cognitive Services account."
  value       = azurerm_cognitive_account.kushw_mfuvtebz_eastus2.id
}