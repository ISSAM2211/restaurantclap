const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { jsPDF } = require('jspdf'); // Assurez-vous d'avoir 'jspdf' installé
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// Permettre au serveur de servir les fichiers statiques depuis le dossier 'public'
// Cela est important si vous voulez que votre serveur Express serve aussi votre fichier HTML
app.use(express.static(path.join(__dirname, 'public')));

// Configuration Nodemailer
// REMPLACER ces valeurs avec vos identifiants réels !
// Pour Gmail, il est FORTEMENT RECOMMANDÉ d'utiliser un "mot de passe d'application"
// plutôt que votre mot de passe Gmail habituel, pour des raisons de sécurité.
// Voir les instructions de Google pour générer un mot de passe d'application.
const transporter = nodemailer.createTransport({
    service: 'gmail', // Ou 'outlook', 'yahoo', etc.
    auth: {
        user: 'restaurantclap@gmail.com', // Votre adresse email d'envoi
        pass: 'Clap1978!' // Votre mot de passe d'application ou mot de passe d'email
    }
});

// Route pour gérer les réservations
app.post('/api/reservations', async (req, res) => {
    try {
        const { name, email, phone, date, time, guests, message } = req.body;

        // --- 1. Génération du PDF ---
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text("Confirmation de Réservation - Restaurant CLAP", 10, 20);

        doc.setFontSize(12);
        doc.text(`Bonjour ${name},`, 10, 40);
        doc.text("Merci pour votre réservation au Restaurant CLAP !", 10, 50);
        doc.text("Voici les détails de votre réservation :", 10, 60);

        doc.setFontSize(14);
        doc.text(`Nom: ${name}`, 20, 80);
        doc.text(`Email: ${email}`, 20, 90);
        doc.text(`Téléphone: ${phone}`, 20, 100);
        doc.text(`Date: ${date}`, 20, 110);
        doc.text(`Heure: ${time}`, 20, 120);
        doc.text(`Nombre de personnes: ${guests}`, 20, 130);
        if (message) {
            doc.text(`Message spécial: ${message}`, 20, 140);
        }

        doc.setFontSize(12);
        doc.text("Nous nous réjouissons de vous accueillir très bientôt !", 10, 160);
        doc.text("Cordialement,", 10, 170);
        doc.text("L'équipe du Restaurant CLAP", 10, 180);

        // Obtenir le buffer du PDF
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        // Créer le dossier temp s'il n'existe pas (pour éviter les erreurs d'écriture)
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)){
            fs.mkdirSync(tempDir);
        }

        // Créer un nom de fichier unique pour le PDF temporaire
        const pdfFilename = `reservation_${Date.now()}.pdf`;
        const pdfPath = path.join(tempDir, pdfFilename);

        // Écrire le fichier PDF temporairement sur le disque (peut être utile pour le débogage)
        fs.writeFileSync(pdfPath, pdfBuffer);

        // --- 2. Envoi des Emails ---

        // Email de confirmation au client
        await transporter.sendMail({
            from: '"Restaurant CLAP" <votreemail@gmail.com>', // Remplacez par votre email d'envoi
            to: email, // Email du client
            subject: 'Confirmation de votre réservation au Restaurant CLAP',
            html: `
                <p>Bonjour ${name},</p>
                <p>Votre réservation au Restaurant CLAP pour le <b>${date}</b> à <b>${time}</b> pour <b>${guests} personnes</b> est confirmée.</p>
                <p>Vous trouverez tous les détails de votre réservation en pièce jointe.</p>
                <p>Nous sommes impatients de vous accueillir !</p>
                <p>Cordialement,</p>
                <p>L'équipe du Restaurant CLAP</p>
            `,
            attachments: [{
                filename: 'Confirmation_Reservation_CLAP.pdf',
                content: pdfBuffer, // Attacher le buffer du PDF
                contentType: 'application/pdf'
            }]
        });

        // Email de notification au restaurant
        await transporter.sendMail({
            from: '"Site Web CLAP" <votreemail@gmail.com>', // Remplacez par votre email d'envoi
            to: 'restaurantclap@gmail.com', // L'email du restaurant pour recevoir les notifications
            subject: `Nouvelle réservation de ${name}`,
            html: `
                <p>Une nouvelle réservation a été effectuée via le site web :</p>
                <ul>
                    <li><b>Nom:</b> ${name}</li>
                    <li><b>Email:</b> ${email}</li>
                    <li><b>Téléphone:</b> ${phone}</li>
                    <li><b>Date:</b> ${date}</li>
                    <li><b>Heure:</b> ${time}</li>
                    <li><b>Nombre de personnes:</b> ${guests}</li>
                    <li><b>Message:</b> ${message || 'Aucun message spécial'}</li>
                </ul>
                <p>Les détails complets sont en pièce jointe.</p>
            `,
            attachments: [{
                filename: `Reservation_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
                content: pdfBuffer, // Attacher le buffer du PDF
                contentType: 'application/pdf'
            }]
        });

        // --- 3. Suppression du fichier PDF temporaire ---
        fs.unlinkSync(pdfPath);

        res.status(200).json({ success: true, message: 'Réservation confirmée et emails envoyés !' });

    } catch (error) {
        console.error('Erreur lors du traitement de la réservation :', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur lors de la réservation', error: error.message });
    }
});

// Port d'écoute du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});