# from crypt import methods

from website import create_app

app = create_app()

# @app.route('/response_text', methods=["GET"])
# def response_text():
#     return "Hi Sending your response"

if __name__ == '__main__':
    app.run(debug=True, host='192.168.180.136')