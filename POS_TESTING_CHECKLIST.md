# POS Page Testing Checklist

## Pre-Testing Setup
1. ✅ Ensure both frontend (port 3000) and backend (port 5000) servers are running
2. ✅ Ensure you're logged in with proper authentication
3. ✅ Verify at least one warehouse exists in the database

## Testing Steps

### 1. Navigate to POS Page
- Open browser and go to: `http://localhost:3000/pos`
- Check if page loads without errors

### 2. Check Browser Console (F12)
Look for these console logs:
- `Warehouses data:` - Should show the array of warehouses
- `Warehouses array:` - Should show processed array
- `Warehouses count:` - Should show number > 0
- Any error messages

### 3. Check Network Tab (F12 → Network)
- Look for request to `/api/warehouses`
- Check status code (should be 200)
- Check response body - should be an array of warehouse objects
- Example response:
```json
[
  {
    "id": 1,
    "name": "Main Warehouse",
    "code": "WH001",
    "isActive": true,
    ...
  }
]
```

### 4. Test Warehouse Dropdown
- Click on the "Warehouse" dropdown
- Should see list of warehouses
- If empty, check:
  - Are warehouses in database?
  - Do they have `isActive: true`?
  - Is there an API error?

### 5. Common Issues & Solutions

#### Issue: Dropdown shows "No warehouses available"
**Solution:**
- Check if warehouses exist: Go to `/warehouses` page
- Create a warehouse if none exist
- Ensure warehouse has `isActive: true`

#### Issue: Dropdown shows "Error loading warehouses"
**Solution:**
- Check browser console for error details
- Check server console for API errors
- Verify authentication token is valid
- Check CORS configuration

#### Issue: Dropdown shows "Loading warehouses..." forever
**Solution:**
- Check Network tab - is the request pending?
- Check server is running on port 5000
- Check API endpoint is accessible: `http://localhost:5000/api/warehouses`

### 6. Expected Behavior
- ✅ Warehouse dropdown should populate with available warehouses
- ✅ Selecting a warehouse should enable product search
- ✅ Products should load for selected warehouse
- ✅ Cart should be empty when warehouse changes

## Quick Database Check
Run this SQL to check warehouses:
```sql
SELECT id, name, code, is_active FROM warehouses;
```

If no warehouses exist, create one:
```sql
INSERT INTO warehouses (name, code, is_active) 
VALUES ('Main Warehouse', 'WH001', true);
```

