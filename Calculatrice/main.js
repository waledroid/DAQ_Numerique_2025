class Calculator {
    constructor(displayElement) {
        this.displayElement = displayElement;
        this.reset();
        // Tracks whether the last action displayed a final result.
        this.resultDisplayed = false;
    }

    reset() {
        this.displayElement.textContent = '0';
        this.currentInput = '';
        this.resultDisplayed = false; // Reset this flag whenever we clear.
    }

    append(value) {
        // If the previous action was a result,
        // and the user presses a number, start fresh.
        if (this.resultDisplayed && !isNaN(value)) {
            this.reset();
        }

        // If display is '0' and user presses a digit (not '.'), clear it.
        if (this.displayElement.textContent === '0' && value !== '.') {
            this.currentInput = '';
        }

        // Append the incoming value to current input.
        this.currentInput += value;
        this.displayElement.textContent = this.currentInput;

        // Once a user presses anything after result, we consider it new input.
        this.resultDisplayed = false;
    }

    delete() {
        this.currentInput = this.currentInput.slice(0, -1);
        this.displayElement.textContent = this.currentInput || '0';
    }

    calculate() {
        try {
            const result = this.evaluateExpression(this.currentInput);
            // Round the result to 4 decimal places to avoid precision issues.
            const roundedResult = parseFloat(result.toFixed(4));
            this.currentInput = roundedResult.toString();
            this.displayElement.textContent = this.currentInput;
            // After displaying the result, set flag.
            this.resultDisplayed = true;
        } catch {
            this.displayElement.textContent = 'Error';
            this.currentInput = '';
        }
    }

    evaluateExpression(expression) {
        // Simple left-to-right split
        const tokens = expression
            .split(/([+\-*/])/)
            .map(token => token.trim())
            .filter(token => token !== '');

        let result = parseFloat(tokens[0]);

        for (let i = 1; i < tokens.length; i += 2) {
            const operator = tokens[i];
            const nextNumber = parseFloat(tokens[i + 1]);

            switch (operator) {
                case '+':
                    result = this.add(result, nextNumber);
                    break;
                case '-':
                    result = this.subtract(result, nextNumber);
                    break;
                case '*':
                    result = this.multiply(result, nextNumber);
                    break;
                case '/':
                    result = this.divide(result, nextNumber);
                    break;
            }
        }
        return result;
    }

    add(a, b) {
        return a + b;
    }

    subtract(a, b) {
        return a - b;
    }

    multiply(a, b) {
        return a * b;
    }

    divide(a, b) {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
    }
}

// Example usage with HTML elements
const display = document.getElementById('display');
const calculator = new Calculator(display);

// Listen for button clicks, interpret 'data-value' as user input
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
        const value = button.getAttribute('data-value');
        if (value === 'C') {
            calculator.reset();
        } else if (value === 'back') {
            calculator.delete();
        } else if (value === '=') {
            calculator.calculate();
        } else {
            calculator.append(value);
        }
    });
});
