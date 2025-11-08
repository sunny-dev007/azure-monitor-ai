#!/bin/bash

# Azure AI Assistant - Subscription Setup Script
# This script helps you get your Azure subscription ID and configure the environment

set -e

echo "🔐 Azure AI Assistant - Subscription Setup"
echo "=========================================="
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "❌ You are not logged into Azure CLI."
    echo "   Please run: az login"
    exit 1
fi

echo "✅ Azure CLI is installed and you are logged in"
echo ""

# Get current account info
echo "📋 Current Azure Account Information:"
echo "------------------------------------"
az account show --query "{name:name, user:user.name, tenantId:tenantId}" --output table
echo ""

# List all subscriptions
echo "📊 Available Subscriptions:"
echo "---------------------------"
az account list --query "[].{name:name, id:id, isDefault:isDefault}" --output table
echo ""

# Get the default subscription
DEFAULT_SUBSCRIPTION=$(az account show --query "id" --output tsv)
DEFAULT_SUBSCRIPTION_NAME=$(az account show --query "name" --output tsv)

echo "🔍 Default Subscription:"
echo "   Name: $DEFAULT_SUBSCRIPTION_NAME"
echo "   ID: $DEFAULT_SUBSCRIPTION"
echo ""

# Ask user if they want to use the default subscription
read -p "Do you want to use the default subscription '$DEFAULT_SUBSCRIPTION_NAME'? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    SUBSCRIPTION_ID=$DEFAULT_SUBSCRIPTION
    SUBSCRIPTION_NAME=$DEFAULT_SUBSCRIPTION_NAME
else
    # Let user select a different subscription
    echo "Please enter the subscription ID you want to use:"
    read -p "Subscription ID: " SUBSCRIPTION_ID
    
    # Validate the subscription ID
    if ! az account show --subscription "$SUBSCRIPTION_ID" &> /dev/null; then
        echo "❌ Invalid subscription ID. Please check and try again."
        exit 1
    fi
    
    SUBSCRIPTION_NAME=$(az account show --subscription "$SUBSCRIPTION_ID" --query "name" --output tsv)
fi

echo ""
echo "✅ Selected Subscription:"
echo "   Name: $SUBSCRIPTION_NAME"
echo "   ID: $SUBSCRIPTION_ID"
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "📝 Updating existing .env file..."
    # Update subscription ID in .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/AZURE_SUBSCRIPTION_ID=.*/AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID/" .env
    else
        # Linux
        sed -i "s/AZURE_SUBSCRIPTION_ID=.*/AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID/" .env
    fi
else
    echo "📝 Creating new .env file..."
    # Create .env file from template
    cp env.production .env
    # Update subscription ID
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/AZURE_SUBSCRIPTION_ID=.*/AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID/" .env
    else
        # Linux
        sed -i "s/AZURE_SUBSCRIPTION_ID=.*/AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID/" .env
    fi
fi

echo "✅ Environment file updated with subscription ID: $SUBSCRIPTION_ID"
echo ""

# Check required permissions
echo "🔐 Checking required permissions..."
echo "--------------------------------"

# Check if the app registration has the required permissions
echo "Checking if your app registration has the required permissions..."

# Get the current user's object ID
USER_OBJECT_ID=$(az ad signed-in-user show --query "id" --output tsv)

# Check Reader role at subscription level
if az role assignment list --assignee "$USER_OBJECT_ID" --scope "/subscriptions/$SUBSCRIPTION_ID" --query "[?roleDefinitionName=='Reader']" --output tsv | grep -q "Reader"; then
    echo "✅ Reader role: Granted"
else
    echo "⚠️  Reader role: Not granted (you can grant it if needed)"
fi

# Check Cost Management Reader role
if az role assignment list --assignee "$USER_OBJECT_ID" --scope "/subscriptions/$SUBSCRIPTION_ID" --query "[?roleDefinitionName=='Cost Management Reader']" --output tsv | grep -q "Cost Management Reader"; then
    echo "✅ Cost Management Reader role: Granted"
else
    echo "⚠️  Cost Management Reader role: Not granted (you can grant it if needed)"
fi

# Check Monitoring Reader role
if az role assignment list --assignee "$USER_OBJECT_ID" --scope "/subscriptions/$SUBSCRIPTION_ID" --query "[?roleDefinitionName=='Monitoring Reader']" --output tsv | grep -q "Monitoring Reader"; then
    echo "✅ Monitoring Reader role: Granted"
else
    echo "⚠️  Monitoring Reader role: Not granted (you can grant it if needed)"
fi

echo ""

# Summary
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Your Azure AI Assistant is now configured with:"
echo "   Tenant ID: $(grep AZURE_TENANT_ID .env | cut -d'=' -f2)"
echo "   Client ID: $(grep AZURE_CLIENT_ID .env | cut -d'=' -f2)"
echo "   Subscription ID: $SUBSCRIPTION_ID"
echo "   Subscription Name: $SUBSCRIPTION_NAME"
echo ""
echo "Next steps:"
echo "1. Configure Azure OpenAI (optional but recommended):"
echo "   - Set AZURE_OPENAI_ENDPOINT in .env"
echo "   - Set AZURE_OPENAI_API_KEY in .env"
echo "   - Set AZURE_OPENAI_DEPLOYMENT_NAME in .env"
echo ""
echo "2. Start the application:"
echo "   npm run dev"
echo ""
echo "3. The application will automatically connect to Azure using your credentials"
echo ""

# Test the connection
echo "🧪 Testing Azure connection..."
if az account show --subscription "$SUBSCRIPTION_ID" &> /dev/null; then
    echo "✅ Azure connection test successful!"
else
    echo "❌ Azure connection test failed. Please check your credentials."
fi

echo ""
echo "🚀 You're ready to use Azure AI Assistant with real Azure data!"
