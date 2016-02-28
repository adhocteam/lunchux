require_relative '../spec_helper'

describe "LunchUX" do

  context "when visiting the home page" do
    it "should welcome the user to the application", js: true do
      visit "/"
      expect(page).to have_content "Welcome"
      expect(page).to have_content "Apply for free"
    end
  end
end