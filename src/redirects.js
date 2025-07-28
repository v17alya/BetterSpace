// redirects.js
const href = document.location.href;

if (href.startsWith('http://localhost') || href.startsWith('http://127.0.0.1')) {
}
else if (href.startsWith('http:')) {
	href = 'https' + href.substring(4);
	document.location.replace(href);
}
