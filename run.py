#!/usr/bin/env python3
"""
Simple HTTP server to run the Defender Reveal landing page.
Usage: python run.py
"""
import http.server
import socketserver
import webbrowser
import os

PORT = 8000

def main():
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    Handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print(f"Serving files from: {script_dir}")
        print("\nPress Ctrl+C to stop the server\n")

        # Open browser automatically
        webbrowser.open(f"http://localhost:{PORT}")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()