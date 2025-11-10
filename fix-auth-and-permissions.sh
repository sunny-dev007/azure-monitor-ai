#!/bin/bash

# Fix Azure Authentication and Assign Permissions
# This script handles the authentication issue and assigns roles

set -e

echo "🔧 Azure Authentication & Permission Fix"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Load environment
print_status "Loading environment variables..."
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
    print_success "Environment loaded"
else
    print_error ".env file not found"
    exit 1
fi

CLIENT_ID="${AZURE_CLIENT_ID}"
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID}"
TENANT_ID="${AZURE_TENANT_ID}"

echo ""
print_status "Configuration:"
echo "  Client ID: $CLIENT_ID"
echo "  Subscription ID: $SUBSCRIPTION_ID"
echo "  Tenant ID: $TENANT_ID"
echo ""

# Step 1: Logout and re-login
print_status "Step 1: Refreshing Azure authentication..."
echo ""

print_warning "Your Azure CLI session has expired. Please login again."
echo ""

# Logout first
print_status "Logging out from Azure CLI..."
az logout 2>/dev/null || true
print_success "Logged out"

echo ""
print_status "Please login to Azure..."
echo ""
echo "⚠️  IMPORTANT: Login with an account that has:"
echo "   - Owner OR User Access Administrator role"
echo "   - On subscription: $SUBSCRIPTION_ID"
echo ""

# Login
az login

echo ""
print_status "Setting active subscription..."
az account set --subscription "$SUBSCRIPTION_ID"

CURRENT_SUB=$(az account show --query name -o tsv)
print_success "Active subscription: $CURRENT_SUB"

echo ""
print_status "Step 2: Checking current role assignments..."
echo ""

# Check current roles
az role assignment list \
    --assignee "$CLIENT_ID" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --query "[].{Role:roleDefinitionName, Scope:scope}" \
    --output table 2>/dev/null || echo "No roles currently assigned"

echo ""
print_status "Step 3: Assigning required roles..."
echo ""

# Assign Reader role
print_status "Assigning Reader role..."
if az role assignment create \
    --assignee "$CLIENT_ID" \
    --role "Reader" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --output none 2>/dev/null; then
    print_success "Reader role assigned"
else
    # Check if already assigned
    if az role assignment list \
        --assignee "$CLIENT_ID" \
        --scope "/subscriptions/$SUBSCRIPTION_ID" \
        --role "Reader" \
        --query "[].roleDefinitionName" \
        --output tsv 2>/dev/null | grep -q "Reader"; then
        print_success "Reader role already assigned"
    else
        print_error "Failed to assign Reader role"
        echo ""
        print_warning "You may not have sufficient permissions."
        echo ""
        echo "Please ask your Azure administrator to run:"
        echo ""
        echo "az role assignment create \\"
        echo "  --assignee \"$CLIENT_ID\" \\"
        echo "  --role \"Reader\" \\"
        echo "  --scope \"/subscriptions/$SUBSCRIPTION_ID\""
        echo ""
        exit 1
    fi
fi

# Assign Cost Management Reader role
echo ""
print_status "Assigning Cost Management Reader role..."
if az role assignment create \
    --assignee "$CLIENT_ID" \
    --role "Cost Management Reader" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --output none 2>/dev/null; then
    print_success "Cost Management Reader role assigned"
else
    # Check if already assigned
    if az role assignment list \
        --assignee "$CLIENT_ID" \
        --scope "/subscriptions/$SUBSCRIPTION_ID" \
        --role "Cost Management Reader" \
        --query "[].roleDefinitionName" \
        --output tsv 2>/dev/null | grep -q "Cost Management Reader"; then
        print_success "Cost Management Reader role already assigned"
    else
        print_error "Failed to assign Cost Management Reader role"
        echo ""
        print_warning "You may not have sufficient permissions."
        echo ""
        echo "Please ask your Azure administrator to run:"
        echo ""
        echo "az role assignment create \\"
        echo "  --assignee \"$CLIENT_ID\" \\"
        echo "  --role \"Cost Management Reader\" \\"
        echo "  --scope \"/subscriptions/$SUBSCRIPTION_ID\""
        echo ""
        exit 1
    fi
fi

# Verify assignments
echo ""
print_status "Step 4: Verifying role assignments..."
echo ""

az role assignment list \
    --assignee "$CLIENT_ID" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --query "[].{Role:roleDefinitionName, Scope:scope}" \
    --output table

echo ""
print_success "✅ Permission assignment complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. ⏱️  Wait 5-10 minutes for role propagation"
echo ""
echo "2. 🔄 Restart your application:"
echo "   npm run dev"
echo "   (In another terminal: cd client && npm start)"
echo ""
echo "3. ✅ Verify it works:"
echo "   curl http://localhost:5000/api/azure/validate-permissions"
echo "   open http://localhost:3000"
echo ""
echo "4. 🔙 To switch back to personal account:"
echo "   cp .env.backup.personal.20251109_141320 .env"
echo "   npm run dev"
echo ""

