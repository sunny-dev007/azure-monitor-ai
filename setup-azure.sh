#!/bin/bash

# Azure AI Assistant Setup Script
# This script helps configure Azure services required for the AI Assistant

set -e

echo "🚀 Azure AI Assistant Setup Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed
check_azure_cli() {
    print_status "Checking Azure CLI installation..."
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Please install it first:"
        echo "  https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    print_success "Azure CLI is installed"
}

# Check if user is logged in to Azure
check_azure_login() {
    print_status "Checking Azure login status..."
    if ! az account show &> /dev/null; then
        print_warning "You are not logged in to Azure. Please login first:"
        az login
    fi
    print_success "Azure login verified"
}

# Get subscription information
get_subscription_info() {
    print_status "Getting subscription information..."
    
    # List available subscriptions
    echo ""
    echo "Available subscriptions:"
    az account list --query "[].{Name:name, ID:id, IsDefault:isDefault}" --output table
    
    # Get current subscription
    CURRENT_SUB=$(az account show --query id -o tsv)
    CURRENT_SUB_NAME=$(az account show --query name -o tsv)
    
    echo ""
    print_success "Current subscription: $CURRENT_SUB_NAME ($CURRENT_SUB)"
    
    # Ask if user wants to change subscription
    read -p "Do you want to use a different subscription? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter subscription ID: " SUBSCRIPTION_ID
        az account set --subscription "$SUBSCRIPTION_ID"
        CURRENT_SUB=$SUBSCRIPTION_ID
        CURRENT_SUB_NAME=$(az account show --query name -o tsv)
        print_success "Switched to subscription: $CURRENT_SUB_NAME"
    fi
}

# Get resource group information
get_resource_group() {
    print_status "Getting resource group information..."
    
    # List existing resource groups
    echo ""
    echo "Existing resource groups:"
    az group list --query "[].{Name:name, Location:location}" --output table
    
    # Ask for resource group
    read -p "Enter resource group name (or press Enter to create new): " RESOURCE_GROUP
    
    if [ -z "$RESOURCE_GROUP" ]; then
        read -p "Enter new resource group name: " RESOURCE_GROUP
        read -p "Enter location (e.g., eastus, westus2): " LOCATION
        
        print_status "Creating resource group: $RESOURCE_GROUP in $LOCATION"
        az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
        print_success "Resource group created successfully"
    else
        # Verify resource group exists
        if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
            print_error "Resource group '$RESOURCE_GROUP' does not exist"
            exit 1
        fi
        LOCATION=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
        print_success "Using existing resource group: $RESOURCE_GROUP in $LOCATION"
    fi
}

# Create service principal
create_service_principal() {
    print_status "Creating service principal..."
    
    SP_NAME="azure-ai-assistant-$(date +%s)"
    
    print_status "Creating service principal: $SP_NAME"
    
    # Create service principal
    SP_OUTPUT=$(az ad sp create-for-rbac \
        --name "$SP_NAME" \
        --role "Reader" \
        --scopes "/subscriptions/$CURRENT_SUB" \
        --sdk-auth)
    
    # Extract credentials
    CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
    CLIENT_SECRET=$(echo "$SP_OUTPUT" | jq -r '.clientSecret')
    TENANT_ID=$(echo "$SP_OUTPUT" | jq -r '.tenantId')
    
    print_success "Service principal created successfully"
    print_status "Client ID: $CLIENT_ID"
    print_status "Tenant ID: $TENANT_ID"
    
    # Assign additional roles
    print_status "Assigning additional roles..."
    
    # Cost Management Reader
    az role assignment create \
        --assignee "$CLIENT_ID" \
        --role "Cost Management Reader" \
        --scope "/subscriptions/$CURRENT_SUB"
    
    # Monitoring Reader
    az role assignment create \
        --assignee "$CLIENT_ID" \
        --role "Monitoring Reader" \
        --scope "/subscriptions/$CURRENT_SUB"
    
    print_success "Additional roles assigned successfully"
}

# Enable required providers
enable_providers() {
    print_status "Enabling required Azure providers..."
    
    providers=(
        "Microsoft.ResourceGraph"
        "Microsoft.CostManagement"
        "Microsoft.Advisor"
        "Microsoft.Insights"
        "Microsoft.OperationalInsights"
    )
    
    for provider in "${providers[@]}"; do
        print_status "Enabling provider: $provider"
        az provider register --namespace "$provider"
        
        # Wait for registration
        while [ "$(az provider show --namespace "$provider" --query registrationState -o tsv)" != "Registered" ]; do
            print_status "Waiting for $provider to register..."
            sleep 10
        done
        print_success "$provider registered successfully"
    done
}

# Create Azure OpenAI resource
create_openai_resource() {
    print_status "Setting up Azure OpenAI resource..."
    
    read -p "Do you want to create an Azure OpenAI resource? (Y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_warning "Skipping Azure OpenAI resource creation"
        print_warning "You will need to provide existing OpenAI endpoint and key"
        return
    fi
    
    OPENAI_NAME="openai-ai-assistant-$(date +%s)"
    
    print_status "Creating Azure OpenAI resource: $OPENAI_NAME"
    
    # Create OpenAI resource
    az cognitiveservices account create \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --kind "OpenAI" \
        --sku "S0"
    
    print_success "Azure OpenAI resource created successfully"
    
    # Get endpoint and key
    OPENAI_ENDPOINT=$(az cognitiveservices account show \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "properties.endpoint" -o tsv)
    
    OPENAI_KEY=$(az cognitiveservices account keys list \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "key1" -o tsv)
    
    print_success "OpenAI Endpoint: $OPENAI_ENDPOINT"
    
    # Deploy GPT-4 model
    print_status "Deploying GPT-4 model..."
    
    # Check if GPT-4 is available
    if az cognitiveservices account models list \
        --name "$OPENAI_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --query "[?name=='gpt-4']" --output table | grep -q "gpt-4"; then
        
        az cognitiveservices account deployment create \
            --resource-group "$RESOURCE_GROUP" \
            --account-name "$OPENAI_NAME" \
            --deployment-name "gpt-4" \
            --model-name "gpt-4" \
            --model-version "0613" \
            --model-format "OpenAI"
        
        print_success "GPT-4 model deployed successfully"
        DEPLOYMENT_NAME="gpt-4"
    else
        print_warning "GPT-4 not available in this region, trying GPT-4o-mini"
        
        az cognitiveservices account deployment create \
            --resource-group "$RESOURCE_GROUP" \
            --account-name "$OPENAI_NAME" \
            --deployment-name "gpt-4o-mini" \
            --model-name "gpt-4o-mini" \
            --model-version "2024-05-13" \
            --model-format "OpenAI"
        
        print_success "GPT-4o-mini model deployed successfully"
        DEPLOYMENT_NAME="gpt-4o-mini"
    fi
}

# Generate environment file
generate_env_file() {
    print_status "Generating environment file..."
    
    if [ -f ".env" ]; then
        print_warning ".env file already exists. Creating backup..."
        cp .env .env.backup.$(date +%s)
    fi
    
    cat > .env << EOF
# Azure Configuration
AZURE_TENANT_ID=$TENANT_ID
AZURE_CLIENT_ID=$CLIENT_ID
AZURE_CLIENT_SECRET=$CLIENT_SECRET
AZURE_SUBSCRIPTION_ID=$CURRENT_SUB

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=$OPENAI_ENDPOINT
AZURE_OPENAI_API_KEY=$OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT_NAME=$DEPLOYMENT_NAME

# Application Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Security
JWT_SECRET=$(openssl rand -hex 32)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
    
    print_success ".env file generated successfully"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Backend dependencies installed"
    else
        print_warning "package.json not found, skipping backend dependencies"
    fi
    
    if [ -d "client" ] && [ -f "client/package.json" ]; then
        cd client
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    else
        print_warning "client/package.json not found, skipping frontend dependencies"
    fi
}

# Main setup function
main() {
    echo "This script will help you set up Azure services for the AI Assistant."
    echo "Make sure you have Azure CLI installed and are logged in."
    echo ""
    
    read -p "Press Enter to continue or Ctrl+C to cancel..."
    
    check_azure_cli
    check_azure_login
    get_subscription_info
    get_resource_group
    create_service_principal
    enable_providers
    create_openai_resource
    generate_env_file
    install_dependencies
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review the generated .env file"
    echo "2. Start the backend server: npm run dev"
    echo "3. Start the frontend: cd client && npm start"
    echo ""
    echo "The application will be available at:"
    echo "- Frontend: http://localhost:3000"
    echo "- Backend: http://localhost:5000"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@"
