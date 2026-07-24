import os
import sys

print("Python version:", sys.version)

libraries = ['pypdf', 'docx', 'openpyxl', 'fitz', 'pdfplumber', 'pandas', 'django', 'fastapi', 'prisma']
for lib in libraries:
    try:
        __import__(lib)
        print(f"  {lib}: Available")
    except ImportError:
        print(f"  {lib}: Not available")

# List all files in scratch/RADIX TALENT MATCH HACKATHON
path = r"d:\anaconda\radix\scratch\RADIX TALENT MATCH HACKATHON"
print("\nFiles in hackathon folder:")
for root, dirs, files in os.walk(path):
    for file in files:
        full_path = os.path.join(root, file)
        print(f"  {os.path.relpath(full_path, path)} ({os.path.getsize(full_path)} bytes)")
