#!/usr/bin/env python3
import re

def check_js_braces_char_by_char(code, start_line):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    
    in_string = None  # None or '"' or "'" or '`'
    in_comment = None  # None or 'single' or 'multi'
    escaped = False
    
    # We will iterate character by character
    chars = list(code)
    idx = 0
    length = len(chars)
    
    current_line = start_line
    line_start_idx = 0
    
    while idx < length:
        char = chars[idx]
        
        # Track line numbers
        if char == '\n':
            current_line += 1
            line_start_idx = idx + 1
            
        # Handle escape characters inside strings
        if escaped:
            escaped = False
            idx += 1
            continue
            
        # Handle comments
        if in_comment == 'single':
            if char == '\n':
                in_comment = None
            idx += 1
            continue
        elif in_comment == 'multi':
            if char == '*' and idx + 1 < length and chars[idx + 1] == '/':
                in_comment = None
                idx += 2
            else:
                idx += 1
            continue
            
        # Handle strings
        if in_string:
            if char == '\\':
                escaped = True
            elif char == in_string:
                in_string = None
            idx += 1
            continue
            
        # Detect comment start
        if char == '/' and idx + 1 < length:
            if chars[idx + 1] == '/':
                in_comment = 'single'
                idx += 2
                continue
            elif chars[idx + 1] == '*':
                in_comment = 'multi'
                idx += 2
                continue
                
        # Detect string start
        if char in ['"', "'", '`']:
            in_string = char
            idx += 1
            continue
            
        # Match braces
        if char in '({[':
            line_str = "".join(chars[line_start_idx:]).split('\n')[0]
            stack.append((char, current_line, line_str))
        elif char in ')}]':
            line_str = "".join(chars[line_start_idx:]).split('\n')[0]
            if not stack:
                print(f"❌ Syntax Error: Unmatched closing '{char}' at line {current_line}:")
                print(f"   Code: {line_str.strip()}")
                return False
            top_char, top_line_no, top_line_content = stack.pop()
            if top_char != mapping[char]:
                print(f"❌ Syntax Error: Mismatched closing '{char}' at line {current_line} (expected '{top_char}' from line {top_line_no}):")
                print(f"   Code at line {current_line}: {line_str.strip()}")
                print(f"   Opening '{top_char}' at line {top_line_no}: {top_line_content.strip()}")
                return False
                
        idx += 1
        
    if stack:
        top_char, top_line_no, top_line_content = stack.pop()
        print(f"❌ Syntax Error: Unmatched opening '{top_char}' at line {top_line_no}:")
        print(f"   Code: {top_line_content.strip()}")
        return False
        
    print("✅ All braces, parentheses, and brackets are perfectly balanced!")
    return True

def main():
    filepath = "frontend/teacher-dashboard.html"
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    matches = list(re.finditer(r'<script\b[^>]*>(.*?)</script>', content, re.DOTALL))
    
    last_match = matches[-1]
    script_content = last_match.group(1)
    script_start_pos = last_match.start(1)
    
    line_offset = content[:script_start_pos].count('\n') + 1
    print(f"Script starts at file line: {line_offset}")
    
    check_js_braces_char_by_char(script_content, line_offset)

if __name__ == '__main__':
    main()
