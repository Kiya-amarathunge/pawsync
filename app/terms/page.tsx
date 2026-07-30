import PublicInfoPage from '@/components/public/PublicInfoPage';

export default function TermsPage() {
  return <PublicInfoPage title="Terms of use" intro="These terms set the basic responsibilities for using PawSync responsibly.">
    <section className="public-policy"><h2>Account responsibility</h2><p>Provide accurate information, protect your login details and use only the role and records you are authorized to access.</p><h2>Pet-care information</h2><p>PawSync organizes information and communication. It does not replace professional veterinary diagnosis, emergency treatment or direct advice from a qualified provider.</p><h2>Bookings and appointment values</h2><p>Displayed prices are appointment values supplied by providers. PawSync does not currently process payments, transfers or refunds.</p><h2>Community conduct</h2><p>Do not post abusive, misleading, dangerous or private information. Reported content may be reviewed, warned, dismissed or removed by an administrator.</p><h2>Provider verification</h2><p>Approval confirms that submitted evidence was administratively reviewed. Providers remain responsible for the accuracy of their services, availability, qualifications and prices.</p></section>
  </PublicInfoPage>;
}
