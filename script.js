class FormHandler {
    constructor() {
        this.form = document.getElementById('qualificationForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.successMessage = document.getElementById('successMessage');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorText = document.getElementById('errorText');
        this.submittedData = new Set();
        this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.loadSubmittedData();
    }

    getFormData() {
        return {
            name: document.getElementById('name').value.trim(),
            contact: document.getElementById('contact').value.trim(),
            purpose: document.getElementById('purpose').value,
            tcp: document.getElementById('tcp').value,
            monthly: document.getElementById('monthly').value,
            income: document.getElementById('income').value,
            financing: document.getElementById('financing').value,
            timeline: document.getElementById('timeline').value,
            source: document.getElementById('source').value,
            decision: document.getElementById('decision').value,
            location: document.getElementById('location').value,
            visit: document.getElementById('visit').value
        };
    }

    validateForm(data) {
        const errors = {};

        if (!data.name || data.name.length < 2) {
            errors.name = 'Name is required (minimum 2 characters)';
        }

        if (!data.contact || !/^[\d\s()\-+]+$/.test(data.contact)) {
            errors.contact = 'Valid contact number is required';
        }

        return errors;
    }

    generateHash(data) {
        const key = `${data.name.toLowerCase()}|${data.contact}`;
        return key;
    }

    isDuplicate(data) {
        const hash = this.generateHash(data);
        return this.submittedData.has(hash);
    }

    saveDuplicateCheck(data) {
        const hash = this.generateHash(data);
        this.submittedData.add(hash);
        localStorage.setItem('submittedLeads', JSON.stringify(Array.from(this.submittedData)));
    }

    loadSubmittedData() {
        const stored = localStorage.getItem('submittedLeads');
        if (stored) {
            this.submittedData = new Set(JSON.parse(stored));
        }
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.classList.remove('hidden');
        this.successMessage.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showSuccess() {
        this.successMessage.classList.remove('hidden');
        this.errorMessage.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    resetForm() {
        this.form.reset();
        this.clearErrors();
    }

    clearErrors() {
        document.querySelectorAll('.error-text').forEach(el => {
            el.classList.add('hidden');
            el.textContent = '';
        });
    }

    setButtonLoading(loading) {
        const btnText = this.submitBtn.querySelector('.btn-text');
        const btnLoader = this.submitBtn.querySelector('.btn-loader');
        
        this.submitBtn.disabled = loading;
        
        if (loading) {
            btnText.classList.add('hidden');
            btnLoader.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.clearErrors();
        
        const data = this.getFormData();
        const errors = this.validateForm(data);
        
        if (Object.keys(errors).length > 0) {
            Object.keys(errors).forEach(field => {
                const input = document.getElementById(field);
                const errorEl = input.nextElementSibling;
                if (errorEl && errorEl.classList.contains('error-text')) {
                    errorEl.textContent = errors[field];
                    errorEl.classList.remove('hidden');
                }
            });
            return;
        }

        if (this.isDuplicate(data)) {
            this.showError('This submission appears to be a duplicate. Please check your information.');
            return;
        }

        this.setButtonLoading(true);

        try {
            const response = await fetch('/.netlify/functions/send-lead', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit form');
            }

            this.saveDuplicateCheck(data);
            this.resetForm();
            this.showSuccess();
        } catch (error) {
            console.error('Submission error:', error);
            this.showError(error.message || 'An error occurred. Please try again.');
        } finally {
            this.setButtonLoading(false);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FormHandler();
});