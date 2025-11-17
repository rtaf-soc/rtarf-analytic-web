from flask import Flask, jsonify
from flask_cors import CORS
from services.get_nodes import get_all_nodes

app = Flask(__name__)
CORS(app)  # อนุญาตทุก origin ชั่วคราว

@app.route("/api/nodes")
def nodes():
    return jsonify(get_all_nodes())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
