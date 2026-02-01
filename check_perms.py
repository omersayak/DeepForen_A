import psutil
try:
    conns = psutil.net_connections(kind='inet')
    print(f"Success. Found {len(conns)} connections.")
    for c in conns[:5]:
        print(c)
except Exception as e:
    print(f"Error: {e}")
