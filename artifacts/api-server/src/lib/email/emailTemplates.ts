export function welcomeEmail(displayName: string): { subject: string; html: string } {
  return {
    subject: '👋 Shelfy here. We need to talk about your pantry.',
    html: `
<h2>Hey ${displayName ?? 'there'}!</h2>
<p>I'm Shelfy — your new pantry pal. I live inside Shelf Esteem and my whole deal is helping you stop buying stuff you already own.</p>
<p>Here's how to get started:</p>
<ol>
  <li><strong>Add your first pantry item</strong> — scan a barcode or type it in</li>
  <li><strong>Browse your recipe matches</strong> — see what you can cook right now</li>
  <li><strong>Set up your shopping list</strong> — I'll track what you actually need</li>
</ol>
<p><a href="https://shelfesteem.app">Go to Shelf Esteem →</a></p>
<p>— Shelfy 🥫</p>
    `.trim(),
  };
}

export function day7Email(displayName: string): { subject: string; html: string } {
  return {
    subject: '7 days in — how\'s your pantry looking?',
    html: `
<h2>Hey ${displayName ?? 'there'}!</h2>
<p>You've been using Shelf Esteem for a week. Nice.</p>
<p>If you're finding it useful, I'd love it if you shared it with a friend who could use some help with their kitchen.</p>
<p><a href="https://shelfesteem.app/account">Get your referral link →</a></p>
<p>— Shelfy 🥫</p>
    `.trim(),
  };
}

export function day14Email(displayName: string): { subject: string; html: string } {
  return {
    subject: 'Your free trial is ending soon',
    html: `
<h2>Hey ${displayName ?? 'there'}!</h2>
<p>Your 14-day free trial of Shelf Esteem is wrapping up.</p>
<p>If Shelf Esteem has been helping you save money and reduce food waste, consider upgrading to keep all your features.</p>
<p><a href="https://shelfesteem.app/pricing">See plans →</a></p>
<p>— Shelfy 🥫</p>
    `.trim(),
  };
}
