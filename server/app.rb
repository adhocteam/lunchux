require 'sinatra'

app_host = ENV["LUNCHUX_APP_HOST"] || "http://localhost:8000"

post "/submit" do
  response.headers["Access-Control-Allow-Origin"] = app_host
  File.open("data/submissions", "a"){|file| file.write(params[:data] + "\n")}
  200
end