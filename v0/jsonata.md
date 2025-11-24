JSONata Concepts
When a state's query language is JSONata, the interpreter supports fields and syntax for querying and transforming data using JSONata. For information about JSONPath, see JSONPath Concepts.

Expressions
A JSONata expression can query, select, transform, and create JSON data.

In the States Language, JSONata expressions are written inside strings that start with {% and end with %}. The syntax of the text inside the {% and %} delimiters is that of JSONata. In JSONata, any name that starts with "$" is a variable, so the value of "{% $year %}" is the current value of the year variable. This document refers to {% %}-delimited JSONata expressions as JSONata strings. When the interpreter evaluates a JSONata string, the result is that of the JSONata expression inside the string.

JSONata has a built-in function library which JSONata expressions can call, for example "{% $sum($order.total) %}". The interpreter MAY define other auxiliary JSONata functions and values, and MAY restrict the use of built-in functions.

JSONata expressions can define their own functions, as with the $product function in this calculation of 5 factorial:

"{% ($product := function($x, $y) {$x * $y}; $reduce([1..5], $product)) %}"`
A variable assigned inside a JSONata expression does not affect the value of any state machine variable. Put another way, the only way to assign a value to a state machine variable is with the "Assign" field.

Reserved "states" Variable with JSONata
The States Language reserves one variable called "states". When the query language is JSONata, the "states" variable is defined as a JSON object containing fields defined by the interpreter as it executes each state. A state MUST NOT assign a value to "states".

The "states" variable is a JSON object containing these fields:

{
  "input":        // The state input
  "result":       // The state's result
  "errorOutput":  // The Error Output in a Catch
  "context":      // The Context Object
}
$states.input refers to the state input, and $states.context refers to the Context Object, both of which can be referenced in any field that accepts JSONata.

$states.result refers to the result that a Task, Map, or Parallel state returns, and can be referenced in the state's top-level "Output" and "Assign" fields.

$states.errorOutput refers to the Error Output the interpreter generates when a Task, Map, or Parallel state reports an error, and can be referenced in a Catcher's "Output" and "Assign" fields.

For example:

"My Task": {
  "Type": "Task",
  "QueryLanguage": "JSONata",
  "Resource": "arn:aws:lambda:us-east-1:123456789012:function:HelloWorld",
  "Output": {
    "customer": "{% $states.input.customer %}",
    "resultStatus": "{% $states.result.status %}",
    "elapsedTime": "{% $states.context.ElapsedTime %}"
  },
  "Catch": [
    {
      "ErrorEquals": ["States.ALL"],
      "Output": {
        "errorDetails": "{% $states.errorOutput %}",
        "input": "{% $states.input %}"
      },
      "Next": "Handle Error"
    }
  ],
  "End": true
}
If the HelloWorld function succeeds, the state will output the JSON object specified by the state's top-level "Output" field, containing the value of the customer field from the state input, the status field from the result of executing the HelloWorld function, and the ElapsedTime field from the interpreter-defined Context Object.

If the HelloWorld function reports an error, the state will output the JSON object specified by the Catcher's "Output" field, which has an "errorDetails" field whose value is the Error Output, and an "input" field whose value is the state input. See Error Handling for details.

Input and Output Processing with JSONata
As described earlier, data is passed between states as JSON texts. A state may need to control the format and content of the data it passes to the external code of a Task State or the branches of a Parallel State, or of the data it passes on as output. Fields named "Arguments" and "Output" exist to support this.

Any state except Fail MAY have "Output".

Task and Parallel States MAY have "Arguments".

Using Arguments and Output
In this discussion, "state input" means the JSON text that is the input to a state, "arguments" means the result of evaluating the "Arguments" field, "result" means the JSON text that a state generates, for example from external code invoked by a Task State, or the combined result of the branches in a Parallel or Map State, and "state output" means the final state output after processing the result with the "Output" field.

The interpreter dispatches data as input to tasks to do useful work, and receives output back from them. A common requirement is to reshape input data to meet the format expectations of tasks, and similarly to reshape the output coming back.

In the Task and Parallel States, the input to tasks is the value of the "Arguments" field, and the result can be reshaped with the "Output" field.

The value of "Arguments" MUST be a JSON text, or a JSONata string that evaluates to a JSON text. If the "Arguments" field is provided, its result becomes the arguments to the external code invoked by a Task State, or the branches of a Parallel State. If not provided, the arguments are the state input. "Arguments" MAY reference $states.input and $states.context, but MUST NOT reference $states.result or $states.errorOutput.

The value of "Output" MUST be a JSON text, or a JSONata string that evaluates to a JSON text. If the "Output" field is provided, its result becomes the state output, which serves as the state input for the next state. If not provided, the state output is the result in a Task, Map, and Parallel State, or the state input in all other states. In all states, "Output" MAY reference $states.input and $states.context. In Task, Map, and Parallel States, the state's top-level "Output" field MAY reference $states.result, and the Catcher's "Output" field MAY reference $states.errorOutput.

Using Assign
The value of an "Assign" field MUST be a JSON object; it has no required fields. The name of each top-level field in the object names a variable to assign, and the field's value provides its new value.

If an "Assign" field is provided, the interpreter first evaluates the new value for each variable, and then performs the assignments. Any variable referenced in an "Assign" field sees its current value as it was when the state was entered, and each variable's new value only takes effect in the next state.

In all states, "Assign" MAY reference $states.input and $states.context. In Task, Map, and Parallel States, the state's top-level "Assign" field MAY reference $states.result, and the Catcher's "Assign" field MAY reference $states.errorOutput.

JSONata Evaluation
In any field that accepts JSONata, if its value, or any value nested inside a JSON object or array, is a JSONata string, the interpreter evaluates the JSONata expression and then replaces it with the result.

For example, suppose a state assigns these variables:

"GetSampleData": {
  "Type": "Pass",
  "Assign": {
    "student": {
      "name": "Scotland",
      "course": [
        { "grade": 34 },
        { "grade": 99 },
        { "grade": 76 },
        { "grade": 96 }
      ]
    },
    "class": {
      "teacher": "Bert"
    },
    "two": "the number 2"
  },
  "Next": "A Task"
}
And the next state references the variables in its "Arguments" and "Output" fields:

"A Task": {
  "Type": "Task",
  "QueryLanguage": "JSONata",
  "Resource": "arn:aws:lambda:us-east-1:123456789012:function:DoTheTask",
  "Arguments": {
    "student": "{% $student.name %}",
    "classInfo": {
      "teacher": "{% $class.teacher %}"
    },
    "values": [ 1, "{% $two %}", "three" ]
  },
  "Output": "{% { 'avg': $average($student.course.grade), 'num': $count($student.course) }  %}",
  "Next": "Process the result"
}
In this case, the "Arguments" field specifies a JSON object that contains JSONata strings for some of its fields and array items, and the "Output" field specifies a single JSONata string to create the entire value. In other words, JSONata can be used to calculate the entire value of a field, or individual parts of it.

The interpreter will first evaluate the JSONata expressions inside the "Arguments" object including field values and array items, and send the resulting object to the DoTheTask function:

{
  "student": "Scotland",
  "classInfo": {
    "teacher": "Bert"
  },
  "values": [ 1, "the number 2", "three" ]
}
After DoTheTask returns, the interpreter will evaluate the "Output" field and return this JSON object:

{
  "avg": 76.25,
  "num": 4
}
JSONata Runtime Errors
A JSONata expression can fail for different reasons. For example:

A JSONata expression may cause a type error, for example "{% $x + $y %}" if $x or $y is not a number.

A JSONata expression may evaluate to a type the field will not accept, for example "TimeoutSeconds": "{% $name %}" in a Task State if $name is a string, because TimeoutSeconds requires a number.

A JSONata expression may evaluate to a value the field will not accept, for example "ToleratedFailurePercentage": "{% $negative %}" if $negative evaluates to a negative number, because ToleratedFailurePercentage requires a number between zero and 100.

A JSONata expression may fail to return a result, for example "{% $data.thisFieldDoesNotExist %}", which is an error because JSON cannot represent an undefined value.

In each case, the interpreter will throw "States.QueryEvaluationError". Task, Map, and Parallel states MAY use a Retrier to retry on the error, and a Catcher to catch the error. See Error Handling for details.

JSONata Restrictions
The States Language places some restrictions on JSONata expressions.

Unrestricted JSONata expressions can reference an implicitly-supplied "input document" using unqualified field names and two built-in variables called "$" and "$$". The States Language does not implicitly provide an input document, so JSONata expressions cannot use "$", "$$", or unqualified field names to reference it. Instead, a JSONata expression MUST reference data through state machine variables.

The variable "$" or an unqualified field name at the top level of a JSONata expression, for example $, $.total, or total, refers to the input document, but "$" or an unqualified field name nested inside an expression, for example $order[$.total > 10] or $order[total > 10], refers to the contextual value at that point in the evaluation. In the States Language, a JSONata expression MUST NOT reference "$" or unqualified field names at the top level, but MAY reference "$" or unqualified field names nested inside an expression.

Since the variable "$$" always refers to the entire input document, a JSONata expression MUST NOT reference "$$".