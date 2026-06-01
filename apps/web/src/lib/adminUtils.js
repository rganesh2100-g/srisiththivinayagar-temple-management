export const isAuthorizedAdmin = (userEmail) => {
  if (!userEmail) return false;
  const authorizedEmails = ['geeemmtechnology@gmail.com', 'admin@demo.com'];
  return authorizedEmails.includes(userEmail.toLowerCase());
};