### Writing tests

Add global utilities in `spec/spec_helper.rb`.

Use `ENV['TEST_ENV']` to test for environment.

### Running tests

Test `localhost` with everything in `spec/`:

    rspec

(`localhost` runs a separate copy of `PET` on port 8181, for the duration of testing.)

Only specs in a particular file:

    rspec spec/features/screener_spec.rb

With the line number of a specific test (it's forgiving, anywhere inside your block):

    rspec spec/features/screener_spec.rb:nn

With another environment:

    TEST_ENV=dev rspec

`TEST_ENV` may be one of `localhost`, `dev`, `test` or `imp1a`.
