from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/levels/<path:filename>')
def serve_level(filename):
    return send_from_directory('levels', filename)

@app.route('/static/items/<path:filename>')
def serve_item(filename):
    return send_from_directory('static/items', filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
