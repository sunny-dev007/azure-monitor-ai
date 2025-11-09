#!/bin/bash

# Azure Environment Switcher Script
# This script helps you switch between different Azure environments/subscriptions

set -e

echo "🔄 Azure Environment Switcher"
echo "============================="
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

# Check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found. Creating from template..."
        cp env.example .env
        print_warning "Please edit .env file with your Azure credentials before continuing."
        exit 1
    fi
}

# Display current configuration
show_current_config() {
    print_status "Current Azure Configuration:"
    echo ""
    
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
        
        echo "  Tenant ID: ${AZURE_TENANT_ID:-Not set}"
        echo "  Client ID: ${AZURE_CLIENT_ID:-Not set}"
        echo "  Subscription ID: ${AZURE_SUBSCRIPTION_ID:-Not set}"
        echo "  Client Secret: ${AZURE_CLIENT_SECRET:+***Set***}"
    else
        print_error ".env file not found"
    fi
    echo ""
}

# Update environment configuration
update_env_config() {
    print_status "Updating .env configuration..."
    
    echo ""
    echo "Please select environment:"
    echo "1. Personal Account (Keep current)"
    echo "2. Azure-Central-AI-Hub (New environment)"
    echo "3. Custom (Enter manually)"
    echo ""
    
    read -p "Enter choice (1-3): " CHOICE
    
    case $CHOICE in
        1)
            print_success "Keeping current configuration"
            ;;
        2)
            print_status "Configuring Azure-Central-AI-Hub environment..."
            
            # Azure-Central-AI-Hub details from screenshot
            TENANT_ID="a8f047ad-e0cb-4b81-badd-4556c4cd71f4"
            CLIENT_ID="1f16c4c4-8c61-4083-bda0-b5cd4f847dff"
            
            # Prompt for client secret (don't hardcode sensitive data)
            read -p "Enter Client Secret from Azure Portal: " CLIENT_SECRET
            
            if [ -z "$CLIENT_SECRET" ]; then
                print_error "Client Secret is required"
                exit 1
            fi
            
            # Ask for subscription ID
            read -p "Enter your Azure Subscription ID: " SUBSCRIPTION_ID
            
            if [ -z "$SUBSCRIPTION_ID" ]; then
                print_error "Subscription ID is required"
                exit 1
            fi
            
            # Backup current .env
            if [ -f ".env" ]; then
                BACKUP_FILE=".env.backup.$(date +%s)"
                cp .env "$BACKUP_FILE"
                print_success "Current .env backed up to $BACKUP_FILE"
            fi
            
            # Update .env file
            print_status "Updating .env file..."
            
            # Read current .env and update only Azure credentials
            while IFS= read -r line || [ -n "$line" ]; do
                if [[ $line =~ ^AZURE_TENANT_ID= ]]; then
                    echo "AZURE_TENANT_ID=$TENANT_ID"
                elif [[ $line =~ ^AZURE_CLIENT_ID= ]]; then
                    echo "AZURE_CLIENT_ID=$CLIENT_ID"
                elif [[ $line =~ ^AZURE_CLIENT_SECRET= ]]; then
                    echo "AZURE_CLIENT_SECRET=$CLIENT_SECRET"
                elif [[ $line =~ ^AZURE_SUBSCRIPTION_ID= ]]; then
                    echo "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
                else
                    echo "$line"
                fi
            done < .env > .env.tmp
            
            mv .env.tmp .env
            
            print_success "Environment configured for Azure-Central-AI-Hub"
            echo ""
            echo "  Tenant ID: $TENANT_ID"
            echo "  Client ID: $CLIENT_ID"
            echo "  Subscription ID: $SUBSCRIPTION_ID"
            echo ""
            ;;
        3)
            print_status "Enter custom configuration..."
            read -p "Tenant ID: " TENANT_ID
            read -p "Client ID: " CLIENT_ID
            read -p "Client Secret: " CLIENT_SECRET
            read -p "Subscription ID: " SUBSCRIPTION_ID
            
            if [ -z "$TENANT_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ] || [ -z "$SUBSCRIPTION_ID" ]; then
                print_error "All fields are required"
                exit 1
            fi
            
            # Similar update process as option 2
            if [ -f ".env" ]; then
                BACKUP_FILE=".env.backup.$(date +%s)"
                cp .env "$BACKUP_FILE"
                print_success "Current .env backed up to $BACKUP_FILE"
            fi
            
            while IFS= read -r line || [ -n "$line" ]; do
                if [[ $line =~ ^AZURE_TENANT_ID= ]]; then
                    echo "AZURE_TENANT_ID=$TENANT_ID"
                elif [[ $line =~ ^AZURE_CLIENT_ID= ]]; then
                    echo "AZURE_CLIENT_ID=$CLIENT_ID"
                elif [[ $line =~ ^AZURE_CLIENT_SECRET= ]]; then
                    echo "AZURE_CLIENT_SECRET=$CLIENT_SECRET"
                elif [[ $line =~ ^AZURE_SUBSCRIPTION_ID= ]]; then
                    echo "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
                else
                    echo "$line"
                fi
            done < .env > .env.tmp
            
            mv .env.tmp .env
            
            print_success "Custom environment configured"
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Fix permissions for the new environment
fix_permissions() {
    echo ""
    read -p "Do you want to fix Azure permissions for this environment? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_status "Running permission fix script..."
        ./fix-azure-permissions.sh
    else
        print_warning "Skipping permission fix. You may encounter 403 errors."
        echo ""
        echo "To fix permissions later, run:"
        echo "  ./fix-azure-permissions.sh"
    fi
}

# Test the configuration
test_config() {
    echo ""
    read -p "Do you want to test the configuration? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        print_status "Testing Azure connection..."
        
        set -a
        source .env
        set +a
        
        # Test authentication
        if command -v az &> /dev/null; then
            print_status "Testing service principal authentication..."
            if az login --service-principal \
                --username "$AZURE_CLIENT_ID" \
                --password "$AZURE_CLIENT_SECRET" \
                --tenant "$AZURE_TENANT_ID" &> /dev/null; then
                print_success "Authentication successful!"
                
                # Show subscription info
                az account show --subscription "$AZURE_SUBSCRIPTION_ID"
                
                # Logout
                az logout &> /dev/null
            else
                print_error "Authentication failed. Please check your credentials."
            fi
        else
            print_warning "Azure CLI not found. Skipping authentication test."
        fi
    fi
}

# Main function
main() {
    check_env_file
    
    echo ""
    show_current_config
    
    echo ""
    update_env_config
    
    echo ""
    fix_permissions
    
    echo ""
    test_config
    
    echo ""
    print_success "✅ Environment configuration complete!"
    echo ""
    echo "Next steps:"
    echo "1. Review the .env file to ensure all settings are correct"
    echo "2. Restart your application server: npm run dev"
    echo "3. Test the application: http://localhost:5000"
    echo ""
    echo "To switch back to your previous environment, restore from the backup:"
    echo "  ls -la .env.backup.*"
    echo "  cp .env.backup.TIMESTAMP .env"
    echo ""
}

# Run main function
main "$@"

