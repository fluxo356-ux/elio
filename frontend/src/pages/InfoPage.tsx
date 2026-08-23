import {
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import "../App.css";
import "./InfoPage.css";


const API_URL =
  (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000");


type PageKey =
  | "contact"
  | "faq"
  | "retours"
  | "confidentialite"
  | "conditions-generales";


type NewsletterStatus =
  | "idle"
  | "success"
  | "error";


const getPageKey =
  (): PageKey => {

    const path =
      window.location.pathname
        .replace(
          /\/+$/,
          ""
        )
        .toLowerCase();


    switch (path) {

      case "/faq":
        return "faq";

      case "/retours":
        return "retours";

      case "/confidentialite":
        return "confidentialite";

      case "/conditions-generales":
        return "conditions-generales";

      case "/contact":
      default:
        return "contact";

    }

  };


function InfoPage() {

  const page =
    getPageKey();


  const [
    newsletterEmail,
    setNewsletterEmail,
  ] =
    useState(
      ""
    );


  const [
    newsletterSubmitting,
    setNewsletterSubmitting,
  ] =
    useState(
      false
    );


  const [
    newsletterMessage,
    setNewsletterMessage,
  ] =
    useState(
      ""
    );


  const [
    newsletterStatus,
    setNewsletterStatus,
  ] =
    useState<NewsletterStatus>(
      "idle"
    );


  const submitNewsletter =
    async (
      event:
        FormEvent<HTMLFormElement>
    ) => {

      event.preventDefault();


      const email =
        newsletterEmail
          .trim()
          .toLowerCase();


      if (
        !email
      ) {

        setNewsletterStatus(
          "error"
        );


        setNewsletterMessage(
          "Veuillez saisir votre adresse e-mail."
        );


        return;

      }


      setNewsletterSubmitting(
        true
      );


      setNewsletterStatus(
        "idle"
      );


      setNewsletterMessage(
        ""
      );


      try {

        const response =
          await fetch(
            `${API_URL}/api/newsletter/subscribe`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    email,
                  }
                ),
            }
          );


        const data =
          await response
            .json()
            .catch(
              () => null
            );


        if (
          !response.ok
        ) {

          throw new Error(
            data &&
            typeof data.detail ===
              "string"
              ? data.detail
              : "Impossible de vous inscrire à la newsletter."
          );

        }


        setNewsletterStatus(
          "success"
        );


        setNewsletterMessage(
          data &&
          typeof data.message ===
            "string"
            ? data.message
            : "Votre inscription à la newsletter ELIO est confirmée."
        );


        setNewsletterEmail(
          ""
        );

      } catch (
        error
      ) {

        setNewsletterStatus(
          "error"
        );


        setNewsletterMessage(
          error instanceof Error
            ? error.message
            : "Impossible de vous inscrire à la newsletter."
        );

      } finally {

        setNewsletterSubmitting(
          false
        );

      }

    };


  return (

    <div className="info-page">


      {/* =================================================== */}
      {/* ANNOUNCEMENT */}
      {/* =================================================== */}

      <div className="announcement">

        Livraison partout en Tunisie

      </div>


      {/* =================================================== */}
      {/* HEADER */}
      {/* =================================================== */}

      <header className="info-header">

        <nav className="info-header-left">

          <a href="/">
            Accueil
          </a>

          <a href="/collection">
            Collection
          </a>

        </nav>


        <a
          href="/"
          className="info-logo"
          aria-label="ELIO Maroquinerie"
        >

          <img
            src="/elio-logo-transparent.png"
            alt="ELIO Maroquinerie"
          />

        </a>


        <nav className="info-header-right">

          <a href="/#maison">
            Maison ELIO
          </a>

          <a href="/?search=1">
            Recherche
          </a>

          <a href="/?openCart=1">
            Panier
          </a>

        </nav>

      </header>


      {/* =================================================== */}
      {/* PAGE HERO */}
      {/* =================================================== */}

      <section className="info-hero">

        <p className="info-kicker">

          {page === "contact" &&
            "SERVICE CLIENT"}

          {page === "faq" &&
            "AIDE & INFORMATIONS"}

          {page === "retours" &&
            "SERVICE APRÈS-VENTE"}

          {page === "confidentialite" &&
            "DONNÉES PERSONNELLES"}

          {page ===
            "conditions-generales" &&
            "INFORMATIONS LÉGALES"}

        </p>


        <h1>

          {page === "contact" &&
            "Contact"}

          {page === "faq" &&
            "F.A.Q"}

          {page === "retours" &&
            "Retours & échanges"}

          {page === "confidentialite" &&
            "Politique de confidentialité"}

          {page ===
            "conditions-generales" &&
            "Conditions générales"}

        </h1>


        <p>

          {page === "contact" &&
            "Une question sur votre commande ou sur une pièce ELIO ? Notre équipe est à votre écoute."}

          {page === "faq" &&
            "Retrouvez les réponses aux principales questions concernant la boutique, les commandes et la livraison."}

          {page === "retours" &&
            "Retrouvez les informations essentielles concernant les retours, échanges et produits non conformes."}

          {page ===
            "confidentialite" &&
            "Découvrez comment ELIO utilise les informations nécessaires au fonctionnement de la boutique et de ses services."}

          {page ===
            "conditions-generales" &&
            "Les présentes conditions encadrent l'utilisation de la boutique ELIO et les commandes passées sur le site."}

        </p>

      </section>


      {/* =================================================== */}
      {/* CONTACT */}
      {/* =================================================== */}

      {
        page ===
          "contact" && (

          <main className="info-content">

            <section className="contact-intro">

              <p className="info-section-label">
                CONTACTER ELIO
              </p>

              <h2>
                Nous sommes
                <br />
                à votre écoute.
              </h2>

              <p>
                Pour une question concernant
                une commande, un produit,
                une livraison ou un retour,
                contactez-nous directement
                par le moyen qui vous convient.
              </p>

            </section>


            <section className="contact-grid">

              <a
                className="contact-card"
                href="tel:+21626570229"
              >

                <span>
                  01
                </span>

                <small>
                  TÉLÉPHONE
                </small>

                <strong>
                  +216 26 570 229
                </strong>

                <p>
                  Appelez ELIO pour toute
                  question concernant votre
                  commande.
                </p>

                <b>
                  Appeler →
                </b>

              </a>


              <a
                className="contact-card"
                href="https://wa.me/21626570229"
                target="_blank"
                rel="noreferrer"
              >

                <span>
                  02
                </span>

                <small>
                  WHATSAPP
                </small>

                <strong>
                  +216 26 570 229
                </strong>

                <p>
                  Contactez-nous facilement
                  depuis WhatsApp.
                </p>

                <b>
                  Ouvrir WhatsApp →
                </b>

              </a>


              <a
                className="contact-card"
                href="mailto:Elio.maroquinerie@gmail.com"
              >

                <span>
                  03
                </span>

                <small>
                  E-MAIL
                </small>

                <strong>
                  Elio.maroquinerie@gmail.com
                </strong>

                <p>
                  Pour une demande détaillée,
                  vous pouvez également nous
                  écrire par e-mail.
                </p>

                <b>
                  Envoyer un e-mail →
                </b>

              </a>


              <a
                className="contact-card"
                href="https://www.instagram.com/elio.maroquinerie/"
                target="_blank"
                rel="noreferrer"
              >

                <span>
                  04
                </span>

                <small>
                  INSTAGRAM
                </small>

                <strong>
                  @elio.maroquinerie
                </strong>

                <p>
                  Retrouvez l'univers ELIO,
                  nos nouveautés et nos
                  collections.
                </p>

                <b>
                  Voir Instagram →
                </b>

              </a>

            </section>


            <section className="info-highlight">

              <div>

                <p className="info-section-label">
                  LIVRAISON
                </p>

                <h3>
                  Partout en Tunisie.
                </h3>

              </div>


              <div className="info-highlight-values">

                <div>

                  <span>
                    Tarif
                  </span>

                  <strong>
                    8 TND
                  </strong>

                </div>


                <div>

                  <span>
                    Délai estimé
                  </span>

                  <strong>
                    48 h
                  </strong>

                </div>


                <div>

                  <span>
                    Paiement
                  </span>

                  <strong>
                    À la livraison
                  </strong>

                </div>

              </div>

            </section>

          </main>

        )
      }


      {/* =================================================== */}
      {/* FAQ */}
      {/* =================================================== */}

      {
        page ===
          "faq" && (

          <main className="info-content info-narrow">

            <section className="faq-list">

              <details open>

                <summary>
                  Comment passer une commande ?
                </summary>

                <p>
                  Choisissez votre produit,
                  sélectionnez sa couleur,
                  ajoutez-le au panier puis
                  renseignez vos informations
                  de livraison. Votre commande
                  est ensuite enregistrée
                  auprès d'ELIO.
                </p>

              </details>


              <details>

                <summary>
                  Quel est le prix de la livraison ?
                </summary>

                <p>
                  La livraison est facturée
                  8 TND pour les commandes
                  livrées en Tunisie.
                </p>

              </details>


              <details>

                <summary>
                  Quel est le délai de livraison ?
                </summary>

                <p>
                  Le délai de livraison estimé
                  est de 48 heures. Ce délai
                  reste indicatif et peut varier
                  selon la destination,
                  la disponibilité du client
                  et les conditions du service
                  de livraison.
                </p>

              </details>


              <details>

                <summary>
                  Comment puis-je payer ?
                </summary>

                <p>
                  Le paiement est actuellement
                  effectué à la livraison.
                </p>

              </details>


              <details>

                <summary>
                  Puis-je modifier ou annuler ma commande ?
                </summary>

                <p>
                  Contactez ELIO dès que possible
                  au +216 26 570 229 ou via
                  WhatsApp. Nous ferons notre
                  possible pour modifier ou
                  annuler la commande avant
                  son expédition.
                </p>

              </details>


              <details>

                <summary>
                  Comment effectuer un retour ?
                </summary>

                <p>
                  Consultez notre page
                  Retours & échanges puis
                  contactez le service client
                  avant tout envoi afin de
                  recevoir les instructions
                  nécessaires.
                </p>

                <a href="/retours">
                  Voir la politique de retour →
                </a>

              </details>


              <details>

                <summary>
                  Que faire si mon produit n'est pas conforme ?
                </summary>

                <p>
                  Contactez-nous rapidement
                  avec votre numéro de commande
                  et, lorsque cela est utile,
                  des photos du produit reçu.
                  Notre équipe vous indiquera
                  la procédure adaptée.
                </p>

              </details>


              <details>

                <summary>
                  Comment contacter ELIO ?
                </summary>

                <p>
                  Vous pouvez nous joindre
                  par téléphone ou WhatsApp
                  au +216 26 570 229,
                  ou par e-mail à
                  Elio.maroquinerie@gmail.com.
                </p>

                <a href="/contact">
                  Contact →
                </a>

              </details>

            </section>


            <section className="faq-contact">

              <p>
                Vous n'avez pas trouvé
                votre réponse ?
              </p>

              <h2>
                Parlons-en.
              </h2>

              <a href="/contact">
                Contacter ELIO
              </a>

            </section>

          </main>

        )
      }


      {/* =================================================== */}
      {/* RETURNS */}
      {/* =================================================== */}

      {
        page ===
          "retours" && (

          <main className="info-content info-legal">

            <section>

              <span className="legal-number">
                01
              </span>

              <div>

                <h2>
                  Demander un retour
                </h2>

                <p>
                  Pour toute demande de
                  retour ou d'échange,
                  contactez ELIO avant
                  d'expédier le produit.
                </p>

                <p>
                  Indiquez votre nom,
                  votre numéro de commande,
                  le produit concerné
                  et la raison de votre
                  demande.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                02
              </span>

              <div>

                <h2>
                  Droit de rétractation
                </h2>

                <p>
                  Pour les ventes électroniques,
                  les droits de rétractation
                  prévus par la législation
                  tunisienne applicable restent
                  pleinement applicables.
                </p>

                <p>
                  Pour une marchandise,
                  une demande de rétractation
                  doit notamment être effectuée
                  dans le délai légal applicable,
                  généralement dans les
                  10 jours ouvrables suivant
                  sa réception, sous réserve
                  des exceptions prévues
                  par la loi.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                03
              </span>

              <div>

                <h2>
                  État du produit
                </h2>

                <p>
                  Le produit retourné doit
                  être conservé avec soin
                  et retourné dans un état
                  permettant son identification
                  et son contrôle.
                </p>

                <p>
                  Cette règle ne limite pas
                  les droits légaux du client
                  lorsqu'un produit est
                  défectueux, endommagé
                  ou non conforme à la commande.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                04
              </span>

              <div>

                <h2>
                  Produit non conforme
                </h2>

                <p>
                  Si le produit reçu ne
                  correspond pas à la commande,
                  contactez ELIO dès que
                  possible.
                </p>

                <p>
                  Selon les conditions prévues
                  par la législation applicable,
                  un produit non conforme peut
                  donner lieu notamment à
                  un remplacement ou à
                  un remboursement.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                05
              </span>

              <div>

                <h2>
                  Frais de retour
                </h2>

                <p>
                  Dans le cadre d'une simple
                  rétractation, les frais
                  directs de retour peuvent
                  rester à la charge du client
                  lorsque la loi le prévoit.
                </p>

                <p>
                  Lorsqu'un produit est
                  non conforme ou qu'une
                  obligation de livraison
                  n'a pas été respectée,
                  les droits légaux applicables
                  au remboursement des frais
                  restent réservés.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                06
              </span>

              <div>

                <h2>
                  Échanges
                </h2>

                <p>
                  Lorsqu'un échange est
                  accepté, il reste soumis
                  à la disponibilité du
                  produit ou de la variante
                  demandée.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                07
              </span>

              <div>

                <h2>
                  Comment nous contacter
                </h2>

                <p>
                  WhatsApp / téléphone :
                  +216 26 570 229
                </p>

                <p>
                  E-mail :
                  Elio.maroquinerie@gmail.com
                </p>

                <a href="/contact">
                  Contacter ELIO →
                </a>

              </div>

            </section>


            <div className="legal-note">

              Cette politique est destinée
              à présenter simplement les
              procédures ELIO. Les droits
              impératifs prévus par la
              législation tunisienne applicable
              demeurent réservés.

            </div>

          </main>

        )
      }


      {/* =================================================== */}
      {/* PRIVACY */}
      {/* =================================================== */}

      {
        page ===
          "confidentialite" && (

          <main className="info-content info-legal">

            <div className="legal-updated">
              Dernière mise à jour :
              14 août 2026
            </div>


            <section>

              <span className="legal-number">
                01
              </span>

              <div>

                <h2>
                  Responsable du traitement
                </h2>

                <p>
                  La boutique ELIO Maroquinerie
                  utilise certaines données
                  personnelles nécessaires à
                  la gestion des commandes,
                  du service client et de
                  la newsletter.
                </p>

                <div className="legal-placeholder">

                  <strong>
                    À compléter avant
                    mise en ligne publique
                  </strong>

                  <span>
                    Identité juridique complète
                    du responsable du traitement
                    et adresse légale.
                  </span>

                </div>

              </div>

            </section>


            <section>

              <span className="legal-number">
                02
              </span>

              <div>

                <h2>
                  Données collectées
                </h2>

                <p>
                  Lors d'une commande,
                  ELIO peut recueillir
                  notamment votre nom,
                  numéro de téléphone,
                  adresse e-mail lorsque
                  vous la fournissez,
                  gouvernorat, ville,
                  adresse de livraison
                  et informations liées
                  à la commande.
                </p>

                <p>
                  Lors d'une inscription
                  à la newsletter,
                  votre adresse e-mail
                  est enregistrée afin
                  de gérer votre inscription.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                03
              </span>

              <div>

                <h2>
                  Utilisation des données
                </h2>

                <p>
                  Les informations sont
                  utilisées pour traiter
                  les commandes, organiser
                  leur livraison, répondre
                  aux demandes du client,
                  assurer le suivi commercial
                  et gérer les inscriptions
                  à la newsletter.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                04
              </span>

              <div>

                <h2>
                  Destinataires
                </h2>

                <p>
                  Les informations sont
                  destinées à ELIO et peuvent,
                  lorsque cela est nécessaire,
                  être communiquées aux
                  prestataires participant
                  directement au fonctionnement
                  de la boutique ou à
                  l'exécution d'une commande,
                  notamment pour la livraison
                  ou l'hébergement technique.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                05
              </span>

              <div>

                <h2>
                  Conservation
                </h2>

                <p>
                  Les données sont conservées
                  pendant la durée nécessaire
                  aux finalités pour lesquelles
                  elles sont utilisées,
                  ainsi que pendant les durées
                  requises par les obligations
                  légales applicables.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                06
              </span>

              <div>

                <h2>
                  Newsletter
                </h2>

                <p>
                  L'inscription à la newsletter
                  est volontaire.
                </p>

                <p>
                  Vous pouvez demander votre
                  désinscription en contactant
                  ELIO par e-mail ou WhatsApp.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                07
              </span>

              <div>

                <h2>
                  Vos droits
                </h2>

                <p>
                  Vous pouvez contacter ELIO
                  pour demander l'exercice
                  des droits qui vous sont
                  reconnus par la législation
                  tunisienne applicable en
                  matière de données
                  personnelles.
                </p>

                <p>
                  E-mail :
                  Elio.maroquinerie@gmail.com
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                08
              </span>

              <div>

                <h2>
                  Formalités de protection
                  des données
                </h2>

                <p>
                  Le traitement des données
                  personnelles est soumis
                  au cadre légal tunisien
                  applicable, notamment à
                  la loi organique n° 2004-63
                  relative à la protection
                  des données à caractère
                  personnel.
                </p>

                <div className="legal-placeholder">

                  <strong>
                    Avant lancement public
                  </strong>

                  <span>
                    Vérifier et accomplir
                    les déclarations ou
                    autorisations INPDP
                    applicables aux traitements
                    réellement utilisés
                    par ELIO.
                  </span>

                </div>

              </div>

            </section>


            <section>

              <span className="legal-number">
                09
              </span>

              <div>

                <h2>
                  Contact
                </h2>

                <p>
                  Pour toute question
                  concernant vos données :
                </p>

                <p>
                  Elio.maroquinerie@gmail.com
                  <br />
                  +216 26 570 229
                </p>

              </div>

            </section>

          </main>

        )
      }


      {/* =================================================== */}
      {/* TERMS */}
      {/* =================================================== */}

      {
        page ===
          "conditions-generales" && (

          <main className="info-content info-legal">

            <div className="legal-updated">
              Dernière mise à jour :
              14 août 2026
            </div>


            <section>

              <span className="legal-number">
                01
              </span>

              <div>

                <h2>
                  Vendeur
                </h2>

                <p>
                  La boutique en ligne
                  est exploitée sous
                  la marque ELIO Maroquinerie.
                </p>

                <div className="legal-placeholder">

                  <strong>
                    À compléter avant
                    mise en ligne publique
                  </strong>

                  <span>
                    Nom / raison sociale,
                    forme juridique le cas
                    échéant, adresse légale,
                    matricule fiscal / RNE
                    lorsque applicable.
                  </span>

                </div>

                <p>
                  Téléphone :
                  +216 26 570 229
                </p>

                <p>
                  E-mail :
                  Elio.maroquinerie@gmail.com
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                02
              </span>

              <div>

                <h2>
                  Produits
                </h2>

                <p>
                  ELIO présente sur le site
                  les caractéristiques
                  essentielles disponibles
                  pour chaque produit,
                  notamment son nom,
                  prix, variantes,
                  disponibilité et,
                  lorsque renseignées,
                  sa matière et ses dimensions.
                </p>

                <p>
                  Les photographies servent
                  à présenter les produits.
                  De légères différences
                  d'affichage peuvent notamment
                  résulter du réglage de
                  l'écran utilisé.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                03
              </span>

              <div>

                <h2>
                  Prix
                </h2>

                <p>
                  Les prix affichés sur
                  la boutique sont indiqués
                  en dinars tunisiens (TND).
                </p>

                <p>
                  Les frais de livraison
                  sont ajoutés séparément
                  au panier et au récapitulatif
                  de commande.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                04
              </span>

              <div>

                <h2>
                  Commande
                </h2>

                <p>
                  Le client sélectionne
                  les produits souhaités,
                  vérifie son panier puis
                  renseigne les informations
                  nécessaires à la livraison.
                </p>

                <p>
                  Après validation,
                  un numéro de commande
                  ELIO est généré.
                  ELIO peut contacter
                  le client afin de confirmer
                  les informations nécessaires
                  à l'exécution de la commande.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                05
              </span>

              <div>

                <h2>
                  Disponibilité
                </h2>

                <p>
                  Les commandes sont soumises
                  à la disponibilité des
                  produits.
                </p>

                <p>
                  Le système vérifie le stock
                  disponible lors de
                  l'enregistrement de la
                  commande.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                06
              </span>

              <div>

                <h2>
                  Livraison
                </h2>

                <p>
                  ELIO propose la livraison
                  en Tunisie.
                </p>

                <p>
                  Le tarif actuellement
                  appliqué est de 8 TND
                  par commande.
                </p>

                <p>
                  Le délai annoncé est
                  estimé à 48 heures et
                  peut varier selon la
                  destination, la disponibilité
                  du client et les conditions
                  opérationnelles du transport.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                07
              </span>

              <div>

                <h2>
                  Paiement
                </h2>

                <p>
                  Le moyen de paiement
                  actuellement proposé est
                  le paiement à la livraison.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                08
              </span>

              <div>

                <h2>
                  Rétractation,
                  retours et conformité
                </h2>

                <p>
                  Les droits du consommateur
                  prévus par la législation
                  tunisienne applicable
                  demeurent pleinement
                  applicables.
                </p>

                <p>
                  Les modalités pratiques
                  sont détaillées sur la page
                  Retours & échanges.
                </p>

                <a href="/retours">
                  Voir Retours & échanges →
                </a>

              </div>

            </section>


            <section>

              <span className="legal-number">
                09
              </span>

              <div>

                <h2>
                  Données personnelles
                </h2>

                <p>
                  Les données nécessaires
                  à la gestion d'une commande
                  et aux services ELIO
                  sont traitées conformément
                  à la politique de
                  confidentialité du site.
                </p>

                <a href="/confidentialite">
                  Politique de confidentialité →
                </a>

              </div>

            </section>


            <section>

              <span className="legal-number">
                10
              </span>

              <div>

                <h2>
                  Propriété intellectuelle
                </h2>

                <p>
                  Les éléments originaux
                  constituant l'identité
                  visuelle ELIO,
                  notamment le nom,
                  les créations graphiques,
                  photographies et contenus
                  produits pour la marque,
                  ne peuvent être réutilisés
                  sans autorisation lorsque
                  ces éléments sont protégés
                  par les droits applicables.
                </p>

              </div>

            </section>


            <section>

              <span className="legal-number">
                11
              </span>

              <div>

                <h2>
                  Service client
                </h2>

                <p>
                  Pour toute question
                  relative à une commande :
                </p>

                <p>
                  +216 26 570 229
                  <br />
                  Elio.maroquinerie@gmail.com
                </p>

                <a href="/contact">
                  Contacter ELIO →
                </a>

              </div>

            </section>


            <div className="legal-note">

              Ces conditions constituent
              une base de travail pour
              la boutique ELIO.
              Elles devront être revues
              avec les informations juridiques
              définitives du vendeur avant
              la mise en ligne commerciale.

            </div>

          </main>

        )
      }


      {/* =================================================== */}
      {/* INSTAGRAM */}
      {/* =================================================== */}

      <section className="social-invite">

        <a
          className="social-invite-link"
          href="https://www.instagram.com/elio.maroquinerie/"
          target="_blank"
          rel="noreferrer"
        >

          <span className="social-invite-kicker">
            Rejoignez-nous sur Instagram
          </span>

          <strong>
            @elio.maroquinerie
          </strong>

          <span className="social-invite-arrow">
            ↗
          </span>

        </a>

      </section>


      {/* =================================================== */}
      {/* FOOTER */}
      {/* =================================================== */}

      <footer
        id="contact-footer"
        className="site-footer"
      >

        <div className="footer-main">


          <div className="footer-column footer-about">

            <h4>
              ELIO
            </h4>


            <p className="footer-about-text">

              ELIO Maroquinerie imagine une
              maroquinerie contemporaine
              où élégance, simplicité
              et caractère se rencontrent.

            </p>


            <p className="footer-location">

              Tunisie · Depuis 2026

              <br />

              Designed in Tunisia

            </p>


            <div className="footer-contact-list">

              <a href="tel:+21626570229">

                +216 26 570 229

              </a>


              <a
                href="https://wa.me/21626570229"
                target="_blank"
                rel="noreferrer"
              >

                WhatsApp

              </a>


              <a href="mailto:Elio.maroquinerie@gmail.com">

                Elio.maroquinerie@gmail.com

              </a>

            </div>

          </div>


          <div className="footer-column">

            <h4>
              Services
            </h4>

            <span className="info-footer-text">
              Livraison · 8 TND
            </span>

            <span className="info-footer-text">
              Livraison estimée · 48 h
            </span>

            <span className="info-footer-text">
              Paiement à la livraison
            </span>

            <a href="/retours">
              Retours & échanges
            </a>

          </div>


          <div className="footer-column">

            <h4>
              Informations
            </h4>

            <a href="/contact">
              Contact
            </a>

            <a href="/faq">
              F.A.Q
            </a>

            <a href="/confidentialite">
              Politique de confidentialité
            </a>

            <a href="/conditions-generales">
              Conditions générales
            </a>

          </div>


          <div className="footer-column">

            <h4>
              Boutique
            </h4>

            <a href="/nouveautes">
              Nouveautés
            </a>

            <a href="/collection/sacs">
              Sacs
            </a>

            <a href="/collection">
              Collection
            </a>

            <a href="/#maison">
              Maison ELIO
            </a>

          </div>


          <div className="footer-column footer-newsletter">

            <h4>
              Newsletter
            </h4>


            <p>

              Recevez les nouveautés ELIO,
              les collections et nos offres privées.

            </p>


            <form
              className="footer-newsletter-form"
              onSubmit={
                submitNewsletter
              }
            >

              <label
                className="sr-only"
                htmlFor="info-newsletter-email"
              >

                Votre adresse e-mail

              </label>


              <div className="footer-newsletter-field">

                <input
                  id="info-newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Votre adresse e-mail"
                  value={
                    newsletterEmail
                  }
                  disabled={
                    newsletterSubmitting
                  }
                  onChange={
                    event => {

                      setNewsletterEmail(
                        event.target.value
                      );


                      if (
                        newsletterStatus !==
                        "idle"
                      ) {

                        setNewsletterStatus(
                          "idle"
                        );

                        setNewsletterMessage(
                          ""
                        );

                      }

                    }
                  }
                />


                <button
                  type="submit"
                  aria-label="S'inscrire à la newsletter ELIO"
                  disabled={
                    newsletterSubmitting
                  }
                >

                  {
                    newsletterSubmitting
                      ? "…"
                      : "→"
                  }

                </button>

              </div>

            </form>


            <small
              className={`footer-newsletter-message ${
                newsletterStatus ===
                  "success"
                  ? "footer-newsletter-message-success"
                  : newsletterStatus ===
                    "error"
                    ? "footer-newsletter-message-error"
                    : ""
              }`}
              aria-live="polite"
            >

              {
                newsletterMessage ||
                "Nous ne partageons jamais votre adresse e-mail avec des tiers."
              }

            </small>

          </div>

        </div>


        <div className="footer-social-row">

          <span>
            Suivez ELIO
          </span>


          <div>

            <a
              href="https://www.instagram.com/elio.maroquinerie/"
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>


            <a
              href="https://www.tiktok.com/@elio.maroquinerie"
              target="_blank"
              rel="noreferrer"
            >
              TikTok
            </a>


            <a
              href="https://wa.me/21626570229"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>

          </div>

        </div>


        <div className="footer-bottom">

          <p>

            © 2026 ELIO Maroquinerie.
            Tous droits réservés.

          </p>


          <div className="footer-bottom-right">

            <span>
              Designed in Tunisia
            </span>

            <span>
              Livraison Tunisie · 8 TND
            </span>

            <span>
              Paiement à la livraison
            </span>

          </div>

        </div>

      </footer>

    </div>

  );

}


export default InfoPage;