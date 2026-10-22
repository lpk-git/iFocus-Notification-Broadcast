/**
 * ============================================================================
 * iFocus Notification Broadcast - Version 1.0
 * Production Release
 * ============================================================================
 * 
 * Functional Features:
 * 1. Comma-separated WhatsApp mobile numbers parsing, trimming & deduplication.
 * 2. Non-destructive format cleaning (spaces, +, -, parentheses).
 * 3. International length validation (8-15 digits, digits-only).
 * 4. Invalid recipient detection (blocking confirmation until resolved).
 * 5. Dynamic recipient counter & duplicate notification.
 * 6. Input safeguard limits: max 50 recipients, max 2000 message characters.
 * 7. Mandatory recipient consent / responsible-use acknowledgement before broadcast.
 * 8. Confirmation modal displaying cleaned unique recipients & message preview.
 * 9. Sequential Recipient Queue with per-recipient "Open in WhatsApp" action.
 * 10. Click-to-chat URL: https://wa.me/<cleaned-number>?text=<encoded-message>
 * 11. WhatsApp opened in new window/tab; manual review/send by user.
 * 12. Recipient status progression: Pending -> Current -> Opened.
 * 13. Final completion state: "All recipients processed".
 * 14. Popup blocker detection & user notification without false progression.
 * 15. Home navigation icon with state reset & in-progress confirmation modal.
 * 16. Purely client-side privacy: zero backend, no databases, no tracking.
 */

(function () {
  'use strict';

  // --- Application Safeguard Limits ---
  const MAX_RECIPIENTS = 50;
  const MAX_MESSAGE_LENGTH = 2000;

  // --- DOM Elements: Form & Inputs ---
  const broadcastForm = document.getElementById('broadcast-form');
  const numbersInput = document.getElementById('whatsapp-numbers');
  const messageInput = document.getElementById('message-text');
  const sendBtn = document.getElementById('send-btn');

  // Containers
  const formSection = document.getElementById('form-section');
  const queueSection = document.getElementById('queue-section');

  // Groups and Error Elements
  const numbersGroup = document.getElementById('numbers-group');
  const messageGroup = document.getElementById('message-group');
  const consentGroup = document.getElementById('consent-group');
  const consentCheckbox = document.getElementById('consent-checkbox');
  const numbersError = document.getElementById('numbers-error');
  const messageError = document.getElementById('message-error');
  const consentError = document.getElementById('consent-error');

  // Duplicate Info Element
  const numbersDuplicate = document.getElementById('numbers-duplicate');
  const numbersDuplicateText = numbersDuplicate ? numbersDuplicate.querySelector('.duplicate-text') : null;

  // Live Indicators
  const recipientCounter = document.getElementById('recipient-counter');
  const charCounter = document.getElementById('char-counter');

  // Status Alert
  const statusAlert = document.getElementById('status-alert');
  const statusAlertText = document.getElementById('status-alert-text');
  const statusAlertClose = document.getElementById('status-alert-close');

  // Header & Home Navigation Elements
  const homeBtn = document.getElementById('home-btn');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const homeConfirmModal = document.getElementById('home-confirm-modal');
  const homeConfirmCloseX = document.getElementById('home-confirm-close-x');
  const homeConfirmCancelBtn = document.getElementById('home-confirm-cancel-btn');
  const homeConfirmReturnBtn = document.getElementById('home-confirm-return-btn');

  // Modal Elements
  const confirmationModal = document.getElementById('confirmation-modal');
  const modalRecipientCount = document.getElementById('modal-recipient-count');
  const modalRecipientsPreview = document.getElementById('modal-recipients-preview');
  const modalMessagePreview = document.getElementById('modal-message-preview');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  const modalCloseX = document.getElementById('modal-close-x');

  // Queue Elements
  const queueReadyBadge = document.getElementById('queue-ready-badge');
  const statTotal = document.getElementById('stat-total');
  const statCurrent = document.getElementById('stat-current');
  const statOpened = document.getElementById('stat-opened');
  const statRemaining = document.getElementById('stat-remaining');
  const queueProgressBar = document.getElementById('queue-progress-bar');
  const queueList = document.getElementById('queue-list');
  const currentRecipientCard = document.getElementById('current-recipient-card');
  const currentCardNumber = document.getElementById('current-card-number');
  const queueCompletedBanner = document.getElementById('queue-completed-banner');
  const completedText = document.getElementById('completed-text');
  const queueOpenBtn = document.getElementById('queue-open-btn');
  const queueOpenBtnText = document.getElementById('queue-open-btn-text');
  const queueResetBtn = document.getElementById('queue-reset-btn');

  // State
  let currentRecipients = []; // Stored between validation and confirmation
  let currentMessage = '';

  // Queue State
  let queueRecipients = [];
  let queueMessage = '';
  let currentQueueIndex = 0;
  let openedIndices = new Set();

  /**
   * Clean common formatting characters from an entered phone number string:
   * Removes spaces, '+', '-', '(', and ')'.
   * Cleans for internal validation without modifying the textarea.
   * 
   * @param {string} raw 
   * @returns {string} cleaned string
   */
  function cleanNumber(raw) {
    if (!raw) return '';
    return raw.replace(/[\s+\-()]/g, '');
  }

  /**
   * Validate whether a cleaned number satisfies international recipient criteria:
   * - Contains digits only
   * - Reasonable international phone-number length of 8 to 15 digits
   * 
   * @param {string} cleaned 
   * @returns {boolean}
   */
  function isValidRecipientNumber(cleaned) {
    return /^\d{8,15}$/.test(cleaned);
  }

  /**
   * Parse comma-separated numbers, clean formatting, validate format & length,
   * and detect duplicates.
   * 
   * @param {string} rawText 
   * @returns {{
   *   rawEntries: string[],
   *   validRecipients: string[],
   *   invalidEntries: string[],
   *   duplicateCount: number
   * }}
   */
  function parseAndValidateRecipients(rawText) {
    if (!rawText || !rawText.trim()) {
      return {
        rawEntries: [],
        validRecipients: [],
        invalidEntries: [],
        duplicateCount: 0
      };
    }

    // Split by comma and trim leading/trailing spaces, ignoring empty entries
    const rawEntries = rawText
      .split(',')
      .map(function (item) {
        return item.trim();
      })
      .filter(function (item) {
        return item.length > 0;
      });

    const validSet = new Set();
    const validRecipients = [];
    const invalidEntries = [];
    let duplicateCount = 0;

    rawEntries.forEach(function (entry) {
      const cleaned = cleanNumber(entry);
      if (isValidRecipientNumber(cleaned)) {
        if (validSet.has(cleaned)) {
          duplicateCount++;
        } else {
          validSet.add(cleaned);
          validRecipients.push(cleaned);
        }
      } else {
        invalidEntries.push(entry);
      }
    });

    return {
      rawEntries: rawEntries,
      validRecipients: validRecipients,
      invalidEntries: invalidEntries,
      duplicateCount: duplicateCount
    };
  }

  /**
   * Update live UI counters (valid/invalid recipient counter, duplicate notice, and character count)
   */
  function updateLiveCounters() {
    const analysis = parseAndValidateRecipients(numbersInput.value);
    const validCount = analysis.validRecipients.length;
    const invalidCount = analysis.invalidEntries.length;

    // Reset counter styles
    recipientCounter.classList.remove('has-invalid', 'has-limit-exceeded');

    // Recipient counter formatting
    if (analysis.rawEntries.length === 0) {
      recipientCounter.textContent = '0 recipients detected';
    } else if (validCount > MAX_RECIPIENTS) {
      if (invalidCount > 0) {
        recipientCounter.textContent = validCount + ' valid (max ' + MAX_RECIPIENTS + ') \u2022 ' + invalidCount + ' invalid';
      } else {
        recipientCounter.textContent = validCount + ' valid (max ' + MAX_RECIPIENTS + ')';
      }
      recipientCounter.classList.add('has-limit-exceeded');
    } else if (invalidCount > 0) {
      recipientCounter.textContent = validCount + ' valid \u2022 ' + invalidCount + ' invalid';
      recipientCounter.classList.add('has-invalid');
    } else {
      recipientCounter.textContent = validCount === 1 ? '1 valid recipient' : validCount + ' valid recipients';
    }

    // Duplicate recipients notice
    if (numbersDuplicate && numbersDuplicateText) {
      if (analysis.duplicateCount > 0) {
        numbersDuplicate.classList.remove('hidden');
        numbersDuplicateText.textContent = analysis.duplicateCount === 1
          ? '1 duplicate recipient ignored.'
          : analysis.duplicateCount + ' duplicate recipients ignored.';
      } else {
        numbersDuplicate.classList.add('hidden');
        numbersDuplicateText.textContent = '';
      }
    }

    // Character counter for message (Format: "350 / 2000 characters")
    const charLength = messageInput.value.length;
    charCounter.textContent = charLength + ' / ' + MAX_MESSAGE_LENGTH + ' characters';
    if (charLength > MAX_MESSAGE_LENGTH) {
      charCounter.classList.add('has-error');
    } else {
      charCounter.classList.remove('has-error');
    }
  }

  /**
   * Display validation error on a field
   * 
   * @param {'numbers' | 'message'} field 
   * @param {string} message 
   */
  function showFieldError(field, message) {
    if (field === 'numbers') {
      numbersGroup.classList.add('has-error');
      numbersError.querySelector('.error-text').textContent = message;
      numbersError.classList.remove('hidden');
    } else if (field === 'message') {
      messageGroup.classList.add('has-error');
      messageError.querySelector('.error-text').textContent = message;
      messageError.classList.remove('hidden');
    } else if (field === 'consent') {
      if (consentGroup) consentGroup.classList.add('has-error');
      if (consentError) {
        consentError.querySelector('.error-text').textContent = message;
        consentError.classList.remove('hidden');
      }
    }
  }

  /**
   * Clear error state for a specific field or all fields
   * 
   * @param {'numbers' | 'message' | 'all'} field 
   */
  function clearFieldErrors(field) {
    if (field === 'numbers' || field === 'all') {
      numbersGroup.classList.remove('has-error');
      numbersError.classList.add('hidden');
      numbersError.querySelector('.error-text').textContent = '';
    }
    if (field === 'message' || field === 'all') {
      messageGroup.classList.remove('has-error');
      messageError.classList.add('hidden');
      messageError.querySelector('.error-text').textContent = '';
    }
    if (field === 'consent' || field === 'all') {
      if (consentGroup) consentGroup.classList.remove('has-error');
      if (consentError) {
        consentError.classList.add('hidden');
        consentError.querySelector('.error-text').textContent = '';
      }
    }
  }

  /**
   * Validate form inputs:
   * - WhatsApp numbers field is mandatory.
   * - Invalid recipient entries must be detected and clearly displayed, blocking confirmation.
   * - At least one valid recipient must be present.
   * - Maximum of 50 unique valid recipients allowed per broadcast session.
   * - Message field is mandatory.
   * - Maximum of 2,000 characters allowed for message.
   * - Consent / responsible-use acknowledgement checkbox is mandatory.
   * 
   * @returns {boolean} True if all valid, false otherwise.
   */
  function validateForm() {
    clearFieldErrors('all');
    let isValid = true;

    const rawNumbersText = numbersInput.value.trim();
    const rawMessage = messageInput.value.trim();

    // 1. Mandatory check for WhatsApp Numbers
    if (!rawNumbersText) {
      showFieldError('numbers', 'Please enter at least one WhatsApp mobile number.');
      isValid = false;
    } else {
      // 2. Validate parsed recipient entries
      const analysis = parseAndValidateRecipients(numbersInput.value);

      if (analysis.rawEntries.length === 0) {
        showFieldError('numbers', 'Please enter at least one WhatsApp mobile number.');
        isValid = false;
      } else if (analysis.invalidEntries.length > 0) {
        showFieldError('numbers', 'Invalid recipients: ' + analysis.invalidEntries.join(', '));
        isValid = false;
      } else if (analysis.validRecipients.length === 0) {
        showFieldError('numbers', 'Please enter at least one valid WhatsApp mobile number.');
        isValid = false;
      } else if (analysis.validRecipients.length > MAX_RECIPIENTS) {
        showFieldError('numbers', 'A maximum of 50 recipients can be processed in one broadcast session.');
        isValid = false;
      }
    }

    // 3. Mandatory check for Message & 2000 character limit
    if (!rawMessage) {
      showFieldError('message', 'Please enter a message to broadcast.');
      isValid = false;
    } else if (messageInput.value.length > MAX_MESSAGE_LENGTH) {
      showFieldError('message', 'Message exceeds the limit of 2,000 characters. Please shorten your message.');
      isValid = false;
    }

    // 4. Mandatory check for Consent / Responsible-Use Acknowledgement
    if (!consentCheckbox || !consentCheckbox.checked) {
      showFieldError('consent', 'Please confirm that recipients expect or have agreed to receive this message.');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Open the confirmation modal with cleaned and unique valid recipients
   * 
   * @param {string[]} recipients 
   * @param {string} message 
   */
  function openConfirmationModal(recipients, message) {
    currentRecipients = recipients;
    currentMessage = message;

    // Recipient count label
    const total = recipients.length;
    modalRecipientCount.textContent = total === 1 ? '1 Valid Recipient' : total + ' Valid Recipients';

    // Populate recipient number chips (cleaned, unique numbers)
    modalRecipientsPreview.innerHTML = '';
    recipients.forEach(function (num) {
      const chip = document.createElement('span');
      chip.className = 'recipient-chip';
      chip.textContent = num;
      modalRecipientsPreview.appendChild(chip);
    });

    // Populate message preview
    modalMessagePreview.textContent = message;

    // Show modal
    confirmationModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    modalConfirmBtn.focus();
  }

  /**
   * Close the confirmation modal and return focus to the form
   */
  function closeConfirmationModal() {
    confirmationModal.classList.add('hidden');
    document.body.style.overflow = '';
    sendBtn.focus();
  }

  /**
   * Display a status alert notice on the page
   * 
   * @param {string} message 
   * @param {'success' | 'error'} [type='success']
   */
  function showStatusAlert(message, type) {
    statusAlertText.textContent = message;
    const iconContainer = statusAlert.querySelector('.status-alert-icon');
    if (type === 'error') {
      statusAlert.classList.add('alert-error');
      if (iconContainer) {
        iconContainer.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      }
    } else {
      statusAlert.classList.remove('alert-error');
      if (iconContainer) {
        iconContainer.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      }
    }
    statusAlert.classList.remove('hidden');
    statusAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Hide status alert notice
   */
  function hideStatusAlert() {
    statusAlert.classList.add('hidden');
    statusAlert.classList.remove('alert-error');
    statusAlertText.textContent = '';
  }

  // ==========================================================================
  // Recipient Queue Management
  // ==========================================================================

  /**
   * Build the WhatsApp Click-to-Chat URL
   * 
   * @param {string} cleanedNumber 
   * @param {string} message 
   * @returns {string} Click-to-chat URL
   */
  function buildWhatsAppUrl(cleanedNumber, message) {
    return 'https://wa.me/' + encodeURIComponent(cleanedNumber) + '?text=' + encodeURIComponent(message);
  }

  /**
   * Render the recipient queue rows and status badges
   */
  function renderQueueList() {
    queueList.innerHTML = '';

    queueRecipients.forEach(function (num, index) {
      const itemRow = document.createElement('div');
      itemRow.className = 'queue-item';

      let statusClass = 'status-pending';
      let statusText = 'Pending';

      if (openedIndices.has(index)) {
        statusClass = 'status-opened';
        statusText = '\u2713 Opened';
        itemRow.classList.add('item-opened');
      } else if (index === currentQueueIndex) {
        statusClass = 'status-current';
        statusText = '\u2190 Current';
        itemRow.classList.add('item-current');
      }

      const leftWrap = document.createElement('div');
      leftWrap.className = 'queue-item-left';

      const indexSpan = document.createElement('span');
      indexSpan.className = 'queue-item-index';
      indexSpan.textContent = (index + 1) + '.';

      const numberSpan = document.createElement('span');
      numberSpan.className = 'queue-item-number';
      numberSpan.textContent = num;

      leftWrap.appendChild(indexSpan);
      leftWrap.appendChild(numberSpan);

      const rightWrap = document.createElement('div');
      rightWrap.className = 'queue-item-right';

      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'queue-status-badge ' + statusClass;
      badgeSpan.textContent = statusText;

      rightWrap.appendChild(badgeSpan);

      itemRow.appendChild(leftWrap);
      itemRow.appendChild(rightWrap);

      queueList.appendChild(itemRow);
    });

    // Auto-scroll to active item if present
    const currentItem = queueList.querySelector('.item-current');
    if (currentItem) {
      currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Update Queue stats, progress bar, callout card and action buttons
   */
  function updateQueueUI() {
    const total = queueRecipients.length;
    const opened = openedIndices.size;
    const remaining = total - opened;

    // Badges & Stats
    queueReadyBadge.textContent = 'Recipients Ready: ' + total;
    statTotal.textContent = total;
    statOpened.textContent = opened;
    statRemaining.textContent = remaining;

    // Progress Bar
    const percent = total > 0 ? Math.round((opened / total) * 100) : 0;
    queueProgressBar.style.width = percent + '%';

    renderQueueList();

    if (currentQueueIndex < total) {
      // Still have recipients to process
      const currentNumber = queueRecipients[currentQueueIndex];
      statCurrent.textContent = '#' + (currentQueueIndex + 1);

      currentRecipientCard.classList.remove('hidden');
      currentCardNumber.textContent = currentNumber;

      queueCompletedBanner.classList.add('hidden');
      queueResetBtn.classList.add('hidden');

      queueOpenBtn.classList.remove('hidden');
      queueOpenBtnText.textContent = (opened === 0) ? 'Open in WhatsApp' : 'Open Next Recipient';
    } else {
      // All recipients processed
      statCurrent.textContent = '\u2713';

      currentRecipientCard.classList.add('hidden');
      queueOpenBtn.classList.add('hidden');

      // Final State Display per requirements:
      // "All recipients processed"
      // "3 of 3 recipients opened in WhatsApp."
      completedText.textContent = opened + ' of ' + total + ' recipients opened in WhatsApp.';
      queueCompletedBanner.classList.remove('hidden');
      queueResetBtn.classList.remove('hidden');
      queueResetBtn.focus();
    }
  }

  /**
   * Initialize and display the Recipient Queue after confirmation
   * 
   * @param {string[]} recipients 
   * @param {string} message 
   */
  function startBroadcastQueue(recipients, message) {
    queueRecipients = recipients.slice();
    queueMessage = message;
    currentQueueIndex = 0;
    openedIndices.clear();

    // Transition from form view to queue view
    hideStatusAlert();
    formSection.classList.add('hidden');
    queueSection.classList.remove('hidden');

    updateQueueUI();
    queueOpenBtn.focus();
  }

  // ==========================================================================
  // Home Navigation & Confirmation Modal
  // ==========================================================================

  /**
   * Check whether an active broadcast is currently in progress with remaining recipients
   * 
   * @returns {boolean}
   */
  function isBroadcastInProgressWithRemaining() {
    const isQueueActive = queueSection && !queueSection.classList.contains('hidden');
    const hasRemaining = queueRecipients.length > 0 && openedIndices.size < queueRecipients.length;
    return isQueueActive && hasRemaining;
  }

  /**
   * Open Home confirmation modal (shown when broadcast is in progress with recipients remaining)
   */
  function openHomeConfirmModal() {
    if (!homeConfirmModal) return;
    homeConfirmModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (homeConfirmCancelBtn) homeConfirmCancelBtn.focus();
  }

  /**
   * Close Home confirmation modal
   */
  function closeHomeConfirmModal() {
    if (!homeConfirmModal) return;
    homeConfirmModal.classList.add('hidden');
    document.body.style.overflow = '';
    if (homeBtn) homeBtn.focus();
  }

  /**
   * Reset application state and return to the initial form view.
   * Clears:
   * - entered WhatsApp numbers
   * - message
   * - recipient queue
   * - Opened/Pending status
   * - progress counters
   * - validation messages
   * - confirmation state
   * - success/completion state
   */
  function resetToInitialForm() {
    // Close modals if open
    if (homeConfirmModal && !homeConfirmModal.classList.contains('hidden')) {
      closeHomeConfirmModal();
    }
    if (confirmationModal && !confirmationModal.classList.contains('hidden')) {
      closeConfirmationModal();
    }

    // Hide status alert notices
    hideStatusAlert();

    // Reset form inputs
    numbersInput.value = '';
    messageInput.value = '';
    if (consentCheckbox) {
      consentCheckbox.checked = false;
    }

    // Clear validation states & errors
    clearFieldErrors('all');
    if (numbersDuplicate) {
      numbersDuplicate.classList.add('hidden');
      if (numbersDuplicateText) numbersDuplicateText.textContent = '';
    }

    // Reset live input counters
    updateLiveCounters();

    // Reset broadcast & queue memory states
    currentRecipients = [];
    currentMessage = '';
    queueRecipients = [];
    queueMessage = '';
    currentQueueIndex = 0;
    openedIndices.clear();

    // Reset Queue elements UI
    if (queueProgressBar) queueProgressBar.style.width = '0%';
    if (queueList) queueList.innerHTML = '';
    if (currentRecipientCard) currentRecipientCard.classList.remove('hidden');
    if (currentCardNumber) currentCardNumber.textContent = '-';
    if (queueCompletedBanner) queueCompletedBanner.classList.add('hidden');
    if (queueResetBtn) queueResetBtn.classList.add('hidden');
    if (queueOpenBtn) {
      queueOpenBtn.classList.remove('hidden');
      if (queueOpenBtnText) queueOpenBtnText.textContent = 'Open in WhatsApp';
    }
    if (statTotal) statTotal.textContent = '0';
    if (statCurrent) statCurrent.textContent = '-';
    if (statOpened) statOpened.textContent = '0';
    if (statRemaining) statRemaining.textContent = '0';
    if (queueReadyBadge) queueReadyBadge.textContent = 'Recipients Ready: 0';

    // Transition back to clean form view
    if (queueSection) queueSection.classList.add('hidden');
    if (formSection) formSection.classList.remove('hidden');

    numbersInput.focus();
  }

  /**
   * Handle user clicking "Open in WhatsApp" / "Open Next Recipient"
   * Constructs the Click-to-Chat URL and opens in a new tab.
   * Handles popup blocking gracefully without false progression.
   * Transitions recipient from Current -> Opened.
   */
  function handleOpenRecipient() {
    if (currentQueueIndex >= queueRecipients.length) return;

    hideStatusAlert();
    const targetNumber = queueRecipients[currentQueueIndex];
    const targetUrl = buildWhatsAppUrl(targetNumber, queueMessage);

    let popupWindow = null;
    try {
      popupWindow = window.open(targetUrl, '_blank');
    } catch (err) {
      popupWindow = null;
    }

    // Check if popup was blocked by browser
    if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
      showStatusAlert('WhatsApp could not be opened. Your browser may have blocked the popup. Please allow popups for this site and try again.', 'error');
      // DO NOT silently mark recipient as Opened if window.open fails
      return;
    }

    // Mark current recipient as Opened (never claiming Sent)
    openedIndices.add(currentQueueIndex);

    // Advance to next recipient
    currentQueueIndex++;

    updateQueueUI();
  }

  // --- Event Listeners ---

  // Live input events for real-time counters, duplicate notification & validation clearing
  numbersInput.addEventListener('input', function () {
    updateLiveCounters();

    const analysis = parseAndValidateRecipients(numbersInput.value);

    // If there was an error displayed, update or clear it dynamically as the user types
    if (numbersGroup.classList.contains('has-error')) {
      if (numbersInput.value.trim().length === 0 || analysis.rawEntries.length === 0) {
        showFieldError('numbers', 'Please enter at least one WhatsApp mobile number.');
      } else if (analysis.invalidEntries.length > 0) {
        showFieldError('numbers', 'Invalid recipients: ' + analysis.invalidEntries.join(', '));
      } else if (analysis.validRecipients.length > MAX_RECIPIENTS) {
        showFieldError('numbers', 'A maximum of 50 recipients can be processed in one broadcast session.');
      } else {
        clearFieldErrors('numbers');
      }
    }
  });

  messageInput.addEventListener('input', function () {
    updateLiveCounters();
    if (messageInput.value.length > MAX_MESSAGE_LENGTH) {
      showFieldError('message', 'Message exceeds the limit of 2,000 characters. Please shorten your message.');
    } else if (messageGroup.classList.contains('has-error')) {
      if (messageInput.value.trim().length === 0) {
        showFieldError('message', 'Please enter a message to broadcast.');
      } else {
        clearFieldErrors('message');
      }
    }
  });

  if (consentCheckbox) {
    consentCheckbox.addEventListener('change', function () {
      if (consentCheckbox.checked) {
        clearFieldErrors('consent');
      }
    });
  }

  // Form submission (Send button)
  broadcastForm.addEventListener('submit', function (event) {
    event.preventDefault();
    hideStatusAlert();

    const isValid = validateForm();
    if (!isValid) {
      if (numbersGroup.classList.contains('has-error')) {
        numbersInput.focus();
      } else if (messageGroup.classList.contains('has-error')) {
        messageInput.focus();
      } else if (consentGroup && consentGroup.classList.contains('has-error')) {
        if (consentCheckbox) consentCheckbox.focus();
      }
      return;
    }

    const analysis = parseAndValidateRecipients(numbersInput.value);
    const message = messageInput.value.trim();

    // Open confirmation modal with cleaned, validated, unique recipients
    openConfirmationModal(analysis.validRecipients, message);
  });

  // Cancel button inside modal
  modalCancelBtn.addEventListener('click', function () {
    closeConfirmationModal();
  });

  // Close X button inside modal
  modalCloseX.addEventListener('click', function () {
    closeConfirmationModal();
  });

  // Confirm & Continue button inside modal (Queue Flow)
  modalConfirmBtn.addEventListener('click', function () {
    closeConfirmationModal();
    // Transition to Recipient Queue
    startBroadcastQueue(currentRecipients, currentMessage);
  });

  // Close alert button
  statusAlertClose.addEventListener('click', function () {
    hideStatusAlert();
  });

  // ==========================================================================
  // Home Navigation Event Listeners
  // ==========================================================================

  // Home icon click in top-left header
  if (homeBtn) {
    homeBtn.addEventListener('click', function () {
      if (isBroadcastInProgressWithRemaining()) {
        openHomeConfirmModal();
      } else {
        resetToInitialForm();
      }
    });
  }

  // Home Confirm Modal: Cancel button
  if (homeConfirmCancelBtn) {
    homeConfirmCancelBtn.addEventListener('click', function () {
      closeHomeConfirmModal();
    });
  }

  // Home Confirm Modal: Close X button
  if (homeConfirmCloseX) {
    homeConfirmCloseX.addEventListener('click', function () {
      closeHomeConfirmModal();
    });
  }

  // Home Confirm Modal: Return Home button (confirmed reset)
  if (homeConfirmReturnBtn) {
    homeConfirmReturnBtn.addEventListener('click', function () {
      closeHomeConfirmModal();
      resetToInitialForm();
    });
  }

  // Close modals on Escape key press
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (homeConfirmModal && !homeConfirmModal.classList.contains('hidden')) {
        closeHomeConfirmModal();
      } else if (confirmationModal && !confirmationModal.classList.contains('hidden')) {
        closeConfirmationModal();
      }
    }
  });

  // Close modal when clicking on the backdrop outside the modal card
  confirmationModal.addEventListener('click', function (event) {
    if (event.target === confirmationModal) {
      closeConfirmationModal();
    }
  });

  if (homeConfirmModal) {
    homeConfirmModal.addEventListener('click', function (event) {
      if (event.target === homeConfirmModal) {
        closeHomeConfirmModal();
      }
    });
  }

  // Queue: Open in WhatsApp button click
  queueOpenBtn.addEventListener('click', function () {
    handleOpenRecipient();
  });

  // Queue: Start New Broadcast button click
  queueResetBtn.addEventListener('click', function () {
    resetToInitialForm();
  });

  // ==========================================================================
  // Theme Management (Light / Dark Theme)
  // ==========================================================================
  const THEME_STORAGE_KEY = 'ifocus_theme';

  /**
   * Apply light or dark theme attributes to <html> and update toggle button.
   * 
   * @param {'light'|'dark'} theme
   */
  function applyTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeToggleBtn) {
        themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
        themeToggleBtn.setAttribute('title', 'Switch to light mode');
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeToggleBtn) {
        themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
        themeToggleBtn.setAttribute('title', 'Switch to dark mode');
      }
    }
  }

  /**
   * Safely retrieve the user's stored theme preference.
   * Only stores/retrieves UI theme preference; never stores recipient or message data.
   * 
   * @returns {string|null}
   */
  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  /**
   * Safely store the user's theme preference in localStorage.
   * 
   * @param {'light'|'dark'} theme
   */
  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      // Storage unavailable or disabled
    }
  }

  /**
   * Toggle between light and dark themes immediately without affecting
   * form state, validation, recipient queue, or WhatsApp workflows.
   */
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    saveTheme(nextTheme);
  }

  /**
   * Initialize theme on load:
   * 1. Check for previously selected theme in localStorage.
   * 2. If 'dark', apply dark theme.
   * 3. Otherwise keep default light theme.
   * 4. Attach click listener to theme toggle button.
   */
  function initTheme() {
    const savedTheme = getSavedTheme();
    if (savedTheme === 'dark') {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }
  }

  // Initial setup
  initTheme();
  updateLiveCounters();

})();

