require 'sinatra'
require 'rubygems'
require 'twilio-ruby'

app_host = ENV["LUNCHUX_APP_HOST"] || "http://localhost:8000"

post "/submit" do
  response.headers["Access-Control-Allow-Origin"] = app_host
  File.open("data/submissions", "a"){|file| file.write(params[:data] + "\n")}
  200
end

get "/sms" do
  twiml = Twilio::TwiML::Response.new do |r|
    r.Message "Apply for free and reduced-price school lunch program at https://lunchux.adhocteam.us/"
  end
  twiml.text
end
