def start_local_server
  print "starting local server for testing..."

  args = %W(python -m SimpleHTTPServer)
  $test_server = ChildProcess.build(*args)
  $test_server.cwd = File.expand_path(File.join(File.dirname(__FILE__), ".."))
  $test_server.leader = true
  $test_server.start

  # nap until we're up
  until system("nc -z localhost 8000 >/dev/null")
    sleep 0.3
  end
  puts "done"
end

def stop_local_server
  puts "\nkilling #{Process.pid}"
  # Kill the child process PET server by process group id
  `pkill -TERM -g #{$test_server.pid}`
  # Kill this process and its webkit child
  `pkill -TERM -P #{Process.pid}`
end

def shutdown
  stop_local_server
  $pet_server.wait
  exit
end

poltergeist_options = {js_errors: false}
Capybara.register_driver :poltergeist do |app|
  Capybara::Poltergeist::Driver.new(app, poltergeist_options)
end
Capybara.javascript_driver = :poltergeist
Capybara.app_host = "http://localhost:8000"

puts "Testing #{Capybara.app_host}"

RSpec.configure do |config|

  config.before(:suite) do
    start_local_server

    Signal.trap("INT") do
      puts "caught INT, shutting down"
      shutdown
    end

    Signal.trap("TERM") do
      puts "caught TERM, shutting down"
      shutdown
    end
  end

  config.after(:suite) do
    stop_local_server
  end

  config.color = true
  config.include Capybara::DSL
end