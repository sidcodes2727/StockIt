import os
import re

directory = '/Users/siddhantsalunke/College/StockIt/backend/app'

# patterns
# match Type | None -> Optional[Type]
# match "Type | None" -> "Optional[Type]" or Optional["Type"]
# Actually, SQLAlchemy 2 handles Optional["Type"] fine.
pattern1 = re.compile(r'([a-zA-Z0-9_]+) \s*\|\s* None')
pattern2 = re.compile(r'"([a-zA-Z0-9_]+) \s*\|\s* None"')

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if '| None' not in content:
        return
        
    new_content = content
    # replace "Type | None" -> Optional["Type"]
    new_content = pattern2.sub(r'Optional["\1"]', new_content)
    # replace Type | None -> Optional[Type]
    new_content = pattern1.sub(r'Optional[\1]', new_content)
    
    if new_content != content:
        # Check if we need to import Optional
        if 'Optional' not in content and 'from typing import' in content:
            new_content = re.sub(r'(from typing import [^\n]+)', r'\1, Optional', new_content, count=1)
        elif 'Optional' not in content:
            # find first import
            new_content = 'from typing import Optional\n' + new_content
            
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.py'):
            process_file(os.path.join(root, file))
