import os
import re

base_path = r'd:\\Web Development\\ITQAN - Apps\\cms-frontend\\src\\app\\features\\admin'

for root, _, files in os.walk(base_path):
    for filename in files:
        if filename.endswith(('.html', '.ts', '.less')):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove dir="rtl"
            new_content = re.sub(r'\s+dir="rtl"', '', content)
            
            # Remove direction: rtl; and direction: rtl
            new_content = re.sub(r'direction:\s*rtl;?', '', new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")
