LunchUX
=======

Ad Hoc's submission for the [E.A.T. School Lunch UX Challenge][1].

[1]: http://lunchux.devpost.com/

Getting started
---------------

### Local development

To run the app locally, start a webserver in the root of this repository, like

```
$ python -m SimpleHTTPServer
```

And then go to the listening address it gives you in your web browser.

### Tests

There are some Jasmine unit-level tests in the jasmine/ directory. To run them, just open the jasmine/SpecRunner.html file in a browser:

```
open jasmine/SpecRunner.html
```

### Configuration
The app can be configured to send the data that is collected to a submission collection url. By default, it sends this to `http://localhost:4567`, which will need to be set to something else for a production deployment. Change the variable value in the `config.js` file to configure where the data should be submitted.

### Submissions

For the purposes of the challenge, we built a very simple server that collects the information posted and appends it to a file. This file is accessible from the website for an admin to download. Based on the rules and the Q&As, we felt this was sufficient to show that the data could be submitted and accessed by an admin. In an actual production deployment, we would implement various checks to ensure that the data was from a reliable source, that it was formatted properly and did not contain errors, etc., but we understood these to not be required for this challenge.

To run the server, make sure that you have a version of Ruby installed on your server, and, from the root directory of the application run:

```
ruby server/app.rb
```

By default, the server will set a CORS response header for `http://localhost:8000`; you should set this to whatever domain you are hosting the application at.

Submitted responses will be appended to the `data/submissions` file, and that file can be accessed via a web browser at `/data/submissions`.