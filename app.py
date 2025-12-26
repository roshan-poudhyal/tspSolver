from flask import Flask, request, jsonify, render_template, send_from_directory
import pandas as pd
import json
import os

app = Flask(__name__, static_url_path='')

# Ensure the uploads directory exists
if not os.path.exists('uploads'):
    os.makedirs('uploads')

@app.route('/')
def index():
    return render_template('solver.html')

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Process based on file type
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
            if not all(col in df.columns for col in ['x', 'y', 'name']):
                return jsonify({'error': 'CSV must contain x, y, and name columns'}), 400
            data = df.to_dict('records')
        elif file.filename.endswith('.json'):
            data = json.load(file)
            if 'cities' not in data:
                return jsonify({'error': 'JSON must contain a cities array'}), 400
            data = data['cities']
        else:
            return jsonify({'error': 'Unsupported file format'}), 400

        return jsonify({'cities': data})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save', methods=['POST'])
def save_solution():
    try:
        data = request.json
        if not data or 'solution' not in data:
            return jsonify({'error': 'No solution provided'}), 400

        # Save the solution to a file
        filename = f'solution_{pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(os.path.join('uploads', filename), 'w') as f:
            json.dump(data, f)

        return jsonify({'message': f'Solution saved as {filename}'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)