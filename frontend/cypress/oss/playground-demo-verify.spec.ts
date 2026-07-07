///<reference path="../global.d.ts" />

describe('playground demo tab', () => {
    before(() => {
        cy.runBefore();
    });

    beforeEach(() => {
        cy.loginUI();
    });

    it('shows both tabs and the existing playground form', () => {
        cy.visit('/playground');
        cy.contains('a', 'Playground').should('be.visible');
        cy.contains('a', 'Demo').should('be.visible');
        cy.contains('Unleash playground').should('be.visible');
        cy.screenshot('01-playground-tab');
    });

    it('walks the three-step wizard and shows the live demo', () => {
        cy.visit('/playground/demo');

        // wizard step 1 "Configure Unleash": setup panel visible, everything
        // downstream locked, flags table hint at the bottom
        cy.get("[data-testid='demo-setup-panel']")
            .should('be.visible')
            .and('contain.text', 'Configure Unleash');
        cy.get("[data-testid='demo-code-sample']").should('not.exist');
        cy.get("[data-testid='demo-canvas-development']").should('not.exist');
        // the status indicator lives inside the step-2 panel
        cy.get("[data-testid='demo-live-indicator']").should('not.exist');
        cy.get("[data-testid='demo-step-setup']").should('be.disabled');
        cy.get("[data-testid='demo-step-live']").should('be.disabled');
        cy.get("[data-testid='demo-create-flags-button']").should(
            'be.disabled',
        );
        cy.get("[data-testid='demo-create-tokens-button']").should(
            'be.disabled',
        );
        cy.contains('Create the demo project to load its feature flags').should(
            'be.visible',
        );

        // setup buttons pass through when resources already exist
        cy.get("[data-testid='demo-create-project-button']").click();
        cy.get("[data-testid='demo-create-project-button']", {
            timeout: 15000,
        }).should('contain.text', 'Demo project created');
        cy.url().should('include', '/playground/demo/flag-city');

        cy.get("[data-testid='demo-create-flags-button']")
            .should('not.be.disabled')
            .click();
        cy.get("[data-testid='demo-create-flags-button']", {
            timeout: 90000,
        }).should('contain.text', 'Feature flags created');
        cy.contains('trafficLights').should('be.visible');
        cy.contains('car-features.color').should('be.visible');

        cy.get("[data-testid='demo-create-tokens-button']")
            .should('not.be.disabled')
            .click();
        cy.get("[data-testid='demo-create-tokens-button']", {
            timeout: 15000,
        }).should('contain.text', 'API tokens created');
        cy.screenshot('02-demo-configure-step');

        // deterministic state for the final live-toggle assertion
        cy.request(
            'POST',
            '/api/admin/projects/flag-city/features/cars/environments/development/off',
        );

        // wizard step 2 "Setup demo app": install -> connect -> wrap
        cy.get("[data-testid='demo-step-setup']")
            .should('not.be.disabled')
            .click();
        cy.get("[data-testid='demo-setup-panel']").should('not.exist');
        cy.get("[data-testid='demo-code-sample']")
            .should('be.visible')
            .and('contain.text', 'How the demo app works?');
        cy.get("[data-testid='demo-live-indicator']").should(
            'contain.text',
            'NOT CONNECTED',
        );

        cy.get("[data-testid='demo-install-button']").click();
        cy.get("[data-testid='demo-live-indicator']").should(
            'contain.text',
            'DEPENDENCIES INSTALLED',
        );
        cy.get("[data-testid='demo-code-sample']").should(
            'contain.text',
            'flag-city:development.',
        );
        cy.get("[data-testid='demo-connect-button']")
            .should('not.be.disabled')
            .click();
        cy.get("[data-testid='demo-live-indicator']").should(
            'contain.text',
            'CONNECTED: READY TO EVALUATE FLAGS',
        );
        cy.get("[data-testid='demo-code-sample']").should(
            'not.contain.text',
            'isEnabled',
        );
        cy.get("[data-testid='demo-use-flag-button']")
            .should('not.be.disabled')
            .click();
        cy.get("[data-testid='demo-code-sample']").should(
            'contain.text',
            "flags.isEnabled('cars')",
        );
        cy.get("[data-testid='demo-live-indicator']").should(
            'contain.text',
            'FLAG EVALUATED',
        );
        cy.screenshot('03-demo-setup-step');

        // wizard step 3 "See it live!": cities replace the panels
        cy.get("[data-testid='demo-step-live']")
            .should('not.be.disabled')
            .click();
        cy.get("[data-testid='flag-city-development'] canvas").should(
            'be.visible',
        );
        cy.get("[data-testid='flag-city-production'] canvas").should(
            'be.visible',
        );
        cy.get("[data-testid='demo-code-sample']").should('not.exist');
        cy.get("[data-testid='demo-setup-panel']").should('not.exist');
        cy.screenshot('04-demo-live-step');

        // toggling a flag steers the development city live
        cy.intercept('POST', '**/cars/environments/development/*').as(
            'toggleRequest',
        );
        cy.get("[data-testid='TOGGLE-cars-development'] input").click();
        cy.wait('@toggleRequest', { timeout: 10000 })
            .its('response.statusCode')
            .should('eq', 200);
        cy.contains('Enabled in development').should('be.visible');
        cy.screenshot('05-demo-after-toggle');
    });

    it('shows the Flag City project with a DEMO badge on the projects page', () => {
        cy.visit('/projects');
        cy.contains('Flag City').should('be.visible');
        cy.get("[data-testid='demo-project-badge']")
            .should('be.visible')
            .and('contain.text', 'DEMO');
        cy.screenshot('06-projects-page-demo-badge');
    });
});
