require 'sinatra'

get "/submit" do
  File.open("data/submissions", "a"){|file| file.write(params[:data] + "\n")}
end