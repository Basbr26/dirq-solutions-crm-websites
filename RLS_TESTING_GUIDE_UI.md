# 🧪 RLS Testing Guide - UI Based

## Doel
Verifiëren dat SALES users alleen hun eigen data kunnen zien en bewerken in de CRM interface.

---

## 📋 Voorbereiding

### 1. Create Test Users via Supabase Dashboard

**Navigeer naar:** Supabase Dashboard → Authentication → Users → Create User

**User A (Owner):**
- Email: `test-owner@dirq.nl`
- Password: `TestOwner123!`
- Role: SALES (via profiles table)
- Temp password: Disable

**User B (Non-Owner):**
- Email: `test-other@dirq.nl`
- Password: `TestOther123!`
- Role: SALES (via profiles table)
- Temp password: Disable

**Na aanmaken:**
```sql
-- Voeg profiles toe via SQL Editor
INSERT INTO profiles (id, voornaam, achternaam, email, role)
VALUES 
  ('[USER-A-UUID]', 'Test', 'Owner', 'test-owner@dirq.nl', 'SALES'),
  ('[USER-B-UUID]', 'Test', 'Other', 'test-other@dirq.nl', 'SALES');
```

---

## 🧪 Test Scenario

### STAP 1: Login als User A (Owner)

1. Open CRM: `http://localhost:5173`
2. Login met: `test-owner@dirq.nl` / `TestOwner123!`
3. Navigeer naar Companies pagina

### STAP 2: Create Test Data (User A)

**Create Company:**
- Name: `Test Company Alpha`
- Status: Prospect
- Industry: Technology
- Priority: High
- Notes: "Created by User A for RLS testing"

**Create Contact:**
- First Name: John
- Last Name: Doe
- Email: john@testalpha.com
- Company: Test Company Alpha
- Is Primary: Yes

**Create Project:**
- Title: Alpha Website
- Company: Test Company Alpha
- Type: Corporate Website
- Stage: Negotiation
- Value: €15,000

**Create Interaction:**
- Company: Test Company Alpha
- Type: Call
- Subject: "Initial Discovery Call"
- Direction: Outbound
- Description: "Discussed project requirements"

**📝 Noteer de Company ID:**
- Open browser DevTools → Network tab
- Bekijk de response van de company creation
- Noteer het `id` veld: `[COMPANY-ALPHA-UUID]`

### STAP 3: Logout User A

- Click op profile icon → Logout

---

### STAP 4: Login als User B (Non-Owner)

1. Login met: `test-other@dirq.nl` / `TestOther123!`
2. Navigeer naar Companies pagina

### STAP 5: RLS Verification Tests

#### ✅ TEST 1: Company List (Should NOT see Alpha)
**Action:** View companies list  
**Expected:** Test Company Alpha is NOT visible  
**Result:** [ ] PASS [ ] FAIL  
**Notes:**

#### ✅ TEST 2: Direct URL Access
**Action:** Navigeer naar `/companies/[COMPANY-ALPHA-UUID]`  
**Expected:** 
- Error: "Company not found" OR
- Empty page OR
- Redirect to companies list  
**Result:** [ ] PASS [ ] FAIL  
**Notes:**

#### ✅ TEST 3: Search for Company
**Action:** Search for "Test Company Alpha" in search bar  
**Expected:** No results found  
**Result:** [ ] PASS [ ] FAIL  
**Notes:**

#### ✅ TEST 4: Projects List
**Action:** View projects page  
**Expected:** "Alpha Website" project NOT visible  
**Result:** [ ] PASS [ ] FAIL  
**Notes:**

#### ✅ TEST 5: Interactions List
**Action:** View interactions/activities page  
**Expected:** "Initial Discovery Call" NOT visible  
**Result:** [ ] PASS [ ] FAIL  
**Notes:**

#### ✅ TEST 6: Create Interaction for Alpha (via DevTools)
**Action:** 
1. Open DevTools → Console
2. Run:
```javascript
const { data, error } = await window.supabase
  .from('interactions')
  .insert({
    company_id: '[COMPANY-ALPHA-UUID]',
    type: 'call',
    subject: 'Unauthorized call',
    direction: 'outbound'
  });
console.log('Error:', error);
```
**Expected:** Error message (RLS blocks insert)  
**Result:** [ ] PASS [ ] FAIL  
**Error Message:**

#### ✅ TEST 7: Dashboard Stats
**Action:** View dashboard  
**Expected:** 
- Total companies: Does NOT include Test Company Alpha
- Revenue stats: Does NOT include €15,000 from Alpha project  
**Result:** [ ] PASS [ ] FAIL  
**Notes:**

---

### STAP 6: Verify User A Still Has Access

1. Logout User B
2. Login as User A (`test-owner@dirq.nl`)

#### ✅ TEST 8: User A Can See Own Company
**Action:** View companies list  
**Expected:** Test Company Alpha IS visible  
**Result:** [ ] PASS [ ] FAIL

#### ✅ TEST 9: User A Can Edit Own Company
**Action:** 
1. Open Test Company Alpha detail page
2. Click "Edit"
3. Change notes to "Updated by owner"
4. Save
**Expected:** Update succeeds, changes are saved  
**Result:** [ ] PASS [ ] FAIL

#### ✅ TEST 10: User A Can Create Interactions
**Action:** 
1. Open Test Company Alpha
2. Click "Add Interaction"
3. Create email interaction
**Expected:** Interaction created successfully  
**Result:** [ ] PASS [ ] FAIL

---

## 🔍 Additional Browser Tests

### TEST 11: Network Tab Inspection (User B)
**Action:**
1. Login as User B
2. Open DevTools → Network tab
3. Navigate to companies page
4. Check the GraphQL/REST request

**Expected:** 
- Query includes `owner_id = [USER-B-UUID]` filter OR
- Response only contains User B's companies

**Result:** [ ] PASS [ ] FAIL

---

## 🚨 Security Issues to Check

### Critical Vulnerabilities:

1. **Data Leakage via Search:**
   - [ ] User B can find User A's companies via search
   - [ ] Company details leak in autocomplete/suggestions

2. **Data Leakage via Relations:**
   - [ ] User B can see contacts linked to User A's companies
   - [ ] User B can see projects via company_id parameter manipulation

3. **Authorization Bypass:**
   - [ ] User B can edit/delete User A's data via direct API calls
   - [ ] User B can create interactions for User A's companies

4. **Information Disclosure:**
   - [ ] Dashboard stats include other users' data
   - [ ] Export functions include unauthorized records

---

## 📊 Test Results Summary

**Test Execution:**
- Date: _____________
- Tester: _____________
- Environment: [ ] Local [ ] Staging [ ] Production

**Results:**
- Tests Passed: ___ / 11
- Tests Failed: ___ / 11
- Critical Issues Found: ___

**Security Status:**
- [ ] ✅ ALL TESTS PASSED - RLS is working correctly
- [ ] ⚠️ MINOR ISSUES - Some edge cases need attention
- [ ] 🔴 CRITICAL ISSUES - Major security vulnerabilities found

**Issues Found:**
```
[Describe any security issues discovered]
```

**Recommendations:**
```
[List recommendations for fixes]
```

---

## 🧹 Cleanup

### Delete Test Data:
1. Login as User A
2. Delete:
   - Test Company Alpha (cascades to contacts, projects, interactions)

### Delete Test Users:
1. Supabase Dashboard → Authentication → Users
2. Delete `test-owner@dirq.nl`
3. Delete `test-other@dirq.nl`

### SQL Cleanup (if needed):
```sql
-- If manual cleanup needed
DELETE FROM interactions WHERE company_id = '[COMPANY-ALPHA-UUID]';
DELETE FROM projects WHERE company_id = '[COMPANY-ALPHA-UUID]';
DELETE FROM contacts WHERE company_id = '[COMPANY-ALPHA-UUID]';
DELETE FROM companies WHERE id = '[COMPANY-ALPHA-UUID]';

-- Delete test profiles
DELETE FROM profiles WHERE email IN ('test-owner@dirq.nl', 'test-other@dirq.nl');
```

---

## ✅ Approval

**RLS Testing Completed:**
- Tested by: _____________
- Date: _____________
- Signature: _____________

**Status for AI Integration:**
- [ ] ✅ APPROVED - Deploy AI integration
- [ ] ⚠️ CONDITIONAL - Fix issues first
- [ ] 🔴 BLOCKED - Critical security issues
