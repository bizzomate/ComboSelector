# ComboSelector

This widget is an implementation of the Dojo ComboBox for Mendix. It provides the user
with a drop down reference selector that can be filtered by typing.


## Typical usage scenario

The ComboSelector can be used in situations where there are too many options for a regular
reference selector, but where a separate select screen isn't a preferable solution.

##Features and limitations
* Allows users to filter drop down reference selectors
* Can be used with Xpath or Microflow as datasource
* Sorting of the list can be done in the widget if necessary
* As the filtering is done in the front-end, calculated attributes can be used
* As the filtering is done in the front-end, all data is loaded at once. Especially with large quantities of data you're advised to use XPath instead of a Microflow datasource.


##Dependencies
* Build and tested using Mendix 6.10.4, 6.10.5 and 7.2.0
