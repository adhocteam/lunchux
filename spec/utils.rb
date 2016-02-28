#
# global test utils
#

# Simulate a 'keydown' event on selected element (jquery syntax).
# 'key' is either symbol in KEYS or an integer.
def keydown(selector, key)
  keycode = KEYS[key] || key.to_i
  script  = "var e = $.Event('keydown', { keyCode: #{keycode} }); $('#{selector}').trigger(e);"
  page.driver.browser.execute_script(script)
end
