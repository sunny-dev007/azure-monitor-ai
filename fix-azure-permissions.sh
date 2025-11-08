#!/bin/bash

# Azure Permissions Fix Script
# This script fixes missing Azure RBAC permissions for the service principal

set -e

echo "🔧 Azure Permissions Fix Script"
echo "================================"
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

# Load environment variables
load_env() {
    print_status "Loading environment variables..."
    
    if [ ! -f ".env" ]; then
        print_error ".env file not found. Please create it first with your Azure credentials."
        exit 1
    fi
    
    # Source the .env file
    set -a
    source .env
    set +a
    
    if [ -z "$AZURE_CLIENT_ID" ] || [ -z "$AZURE_SUBSCRIPTION_ID" ]; then
        print_error "Missing required environment variables in .env file:"
        echo "  - AZURE_CLIENT_ID"
        echo "  - AZURE_SUBSCRIPTION_ID"
        exit 1
    fi
    
    print_success "Environment variables loaded"
    print_status "Client ID: $AZURE_CLIENT_ID"
    print_status "Subscription ID: $AZURE_SUBSCRIPTION_ID"
}

# Check current role assignments
check_current_roles() {
    print_status "Checking current role assignments..."
    
    echo ""
    echo "Current role assignments for service principal:"
    az role assignment list \
        --assignee "$AZURE_CLIENT_ID" \
        --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID" \
        --query "[].{Role:roleDefinitionName, Scope:scope}" \
        --output table || print_warning "Could not list role assignments"
    
    echo ""
}

# Assign required roles
assign_roles() {
    print_status "Assigning required Azure RBAC roles..."
    
    # Required roles
    ROLES=(
        "Reader"
        "Cost Management Reader"
    )
    
    for ROLE in "${ROLES[@]}"; do
        print_status "Checking/Assigning role: $ROLE"
        
        # Check if role is already assigned
        if az role assignment list \
            --assignee "$AZURE_CLIENT_ID" \
            --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID" \
            --role "$ROLE" \
            --query "[].roleDefinitionName" \
            --output tsv | grep -q "$ROLE"; then
            print_success "Role '$ROLE' is already assigned"
        else
            print_status "Assigning role '$ROLE'..."
            if az role assignment create \
                --assignee "$AZURE_CLIENT_ID" \
                --role "$ROLE" \
                --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID" \
                --output none; then
                print_success "Role '$ROLE' assigned successfully"
            else
                print_error "Failed to assign role '$ROLE'"
                print_warning "You may need to have 'Owner' or 'User Access Administrator' role to assign roles"
                return 1
            fi
        fi
    done
    
    echo ""
}

# Verify role assignments
verify_roles() {
    print_status "Verifying role assignments..."
    
    ROLES=(
        "Reader"
        "Cost Management Reader"
    )
    
    ALL_ASSIGNED=true
    for ROLE in "${ROLES[@]}"; do
        if az role assignment list \
            --assignee "$AZURE_CLIENT_ID" \
            --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID" \
            --role "$ROLE" \
            --query "[].roleDefinitionName" \
            --output tsv | grep -q "$ROLE"; then
            print_success "✓ Role '$ROLE' is assigned"
        else
            print_error "✗ Role '$ROLE' is NOT assigned"
            ALL_ASSIGNED=false
        fi
    done
    
    echo ""
    
    if [ "$ALL_ASSIGNED" = true ]; then
        print_success "All required roles are assigned!"
        return 0
    else
        print_error "Some roles are missing. Please check the errors above."
        return 1
    fi
}

# Test permissions
test_permissions() {
    print_status "Testing permissions..."
    
    # Test subscription read
    print_status "Testing subscription read access..."
    if az account show --subscription "$AZURE_SUBSCRIPTION_ID" &> /dev/null; then
        print_success "Subscription read access: OK"
    else
        print_warning "Subscription read access: Failed (this is expected if using service principal)"
    fi
    
    # Note: We can't easily test cost management permissions without making actual API calls
    # The application will test these when it runs
    print_status "Cost management permissions will be tested when the application runs"
    
    echo ""
}

# Main function
main() {
    echo "This script will fix missing Azure RBAC permissions for your service principal."
    echo ""
    
    check_azure_cli
    check_azure_login
    load_env
    
    echo ""
    print_status "Starting permission fix process..."
    echo ""
    
    check_current_roles
    
    if assign_roles; then
        echo ""
        if verify_roles; then
            echo ""
            test_permissions
            echo ""
            print_success "✅ Permission fix completed successfully!"
            echo ""
            echo "Next steps:"
            echo "1. Restart your application server"
            echo "2. Test the API endpoints to verify permissions"
            echo "3. Check the application logs for any remaining issues"
            echo ""
            echo "You can test permissions by calling:"
            echo "  curl http://localhost:5000/api/azure/validate-permissions"
            echo ""
        else
            echo ""
            print_error "❌ Permission verification failed"
            echo ""
            echo "Troubleshooting:"
            echo "1. Ensure you have 'Owner' or 'User Access Administrator' role on the subscription"
            echo "2. Check that the service principal (Client ID) is correct"
            echo "3. Verify the subscription ID is correct"
            echo "4. Wait a few minutes for role assignments to propagate"
            echo ""
            exit 1
        fi
    else
        echo ""
        print_error "❌ Failed to assign roles"
        echo ""
        echo "Troubleshooting:"
        echo "1. Ensure you have 'Owner' or 'User Access Administrator' role on the subscription"
        echo "2. Check that the service principal (Client ID) exists and is correct"
        echo "3. Verify the subscription ID is correct"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"

