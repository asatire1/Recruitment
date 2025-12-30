/**
 * No Token Page
 * Shown when user visits the booking page without a valid token
 */

export function NoTokenPage() {
  return (
    <div className="no-token-container">
      <div className="no-token-icon">
        <LinkIcon />
      </div>
      
      <h1 className="no-token-title">Booking Link Required</h1>
      
      <p className="no-token-message">
        To schedule an interview or trial, you'll need a booking link from our recruitment team.
      </p>
      
      <div className="no-token-steps">
        <h2>How to get a booking link:</h2>
        <ol>
          <li>Apply for a position with Allied Pharmacies</li>
          <li>Our recruitment team will review your application</li>
          <li>If successful, you'll receive an email with your personal booking link</li>
        </ol>
      </div>
      
      <div className="no-token-help">
        <p>Already have a link?</p>
        <p className="help-text">
          Check your email from Allied Pharmacies Recruitment. The booking link will be in the invitation email.
        </p>
      </div>
      
      <div className="no-token-contact">
        <p>Questions? Contact us at:</p>
        <a href="mailto:recruitment@alliedpharmacies.co.uk" className="contact-link">
          recruitment@alliedpharmacies.co.uk
        </a>
      </div>
    </div>
  )
}

function LinkIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="48"
      height="48"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" 
      />
    </svg>
  )
}
