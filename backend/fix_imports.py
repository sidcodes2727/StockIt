import os
import re

files_to_fix = [
    '/Users/siddhantsalunke/College/StockIt/backend/app/__init__.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/errors.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/utils/references.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/utils/pagination.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/models/purchase.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/models/product.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/models/supplier.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/models/category.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/models/sale.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/routes/users.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/routes/categories.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/routes/products.py',
    '/Users/siddhantsalunke/College/StockIt/backend/app/routes/dashboard.py'
]

for filepath in files_to_fix:
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    
    # if line 0 is from typing import Optional
    if lines[0] == 'from typing import Optional':
        lines.pop(0)
        # find where to insert it
        insert_idx = 0
        for i, line in enumerate(lines):
            if 'from __future__ import' in line:
                insert_idx = i + 1
                break
        
        # also handle case where it was added by my script but there's a docstring?
        # just put it after future import, or at index 0 if no future import
        lines.insert(insert_idx, 'from typing import Optional')
        
        with open(filepath, 'w') as f:
            f.write('\n'.join(lines))
        print(f"Fixed {filepath}")
