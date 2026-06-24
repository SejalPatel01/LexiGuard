import { Chat } from '../types';

export const INITIAL_MOCK_CHATS: Chat[] = [
  {
    id: 'chat-landlord-deposit',
    title: 'Landlord Deposit Issue',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    messages: [
      {
        id: 'msg-landlord-1',
        role: 'user',
        content: 'My landlord is refusing to return my security deposit of $1,500. He claims there are damages, but we cleaned the house completely and took photos.',
        timestamp: new Date(Date.now() - 3600000 * 4).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'msg-landlord-2',
        role: 'assistant',
        content: 'Under standard rental laws, a landlord must return the security deposit within a specific period (usually 14–30 days depending on your jurisdiction) or provide an itemized list of deductions for damages beyond normal wear and tear.\n\nSince you have photos showing the clean state of the apartment, we have strong evidence to contest this. Let\'s start by reviewing your lease agreement and drafting a formal Demand Notice.',
        timestamp: new Date(Date.now() - 3600000 * 4 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    checklist: [
      { id: 'chk-1', label: 'Rent Agreement', checked: true },
      { id: 'chk-2', label: 'Bank Transfer Proof', checked: true },
      { id: 'chk-3', label: 'Property Handover Document', checked: false },
      { id: 'chk-4', label: 'Screenshots / Visual Evidence', checked: true },
      { id: 'chk-5', label: 'WhatsApp Messages', checked: true }
    ],
    caseStrength: {
      score: 85,
      riskLevel: 'Strong Case',
      riskFactors: [
        'Move-out photographs verify the premises are in clean, undamaged condition.',
        'Landlord failed to provide an itemized statement within the statutory 21-day window.',
        'Written communications show the landlord acknowledged the lease termination without prior complaints.'
      ]
    },
    timeline: [
      {
        id: 't-1',
        title: 'Lease Agreement Terminated',
        date: 'May 31, 2026',
        description: 'Tenancy ended and key handover completed.',
        status: 'completed'
      },
      {
        id: 't-2',
        title: 'Demand Notice Served',
        date: 'June 10, 2026',
        description: 'Served formal demand letter for return of security deposit.',
        status: 'completed'
      },
      {
        id: 't-3',
        title: 'Landlord Reply Window',
        date: 'June 24, 2026',
        description: 'Awaiting landlord response or payment. Default deadline is 14 days.',
        status: 'current'
      },
      {
        id: 't-4',
        title: 'Small Claims Filing',
        date: 'July 01, 2026',
        description: 'File a petition in Small Claims Court if no response is received.',
        status: 'upcoming'
      }
    ],
    generatedDocs: [
      {
        id: 'doc-1',
        title: 'Security Deposit Demand Letter',
        type: 'Notice',
        date: 'June 10, 2026',
        previewText: 'DEMAND FOR IMMEDIATE RETURN OF SECURITY DEPOSIT\n\nTo: Landlord Services Inc.\nAddress: 104 Park Avenue, Suite 2B\n\nDear Landlord,\n\nPursuant to Section 1950.5 of the Civil Code, I hereby demand the return of my security deposit of $1,500.00 in full. The premises were returned in a clean and undamaged state, normal wear and tear excepted...'
      }
    ],
    summary: {
      overview: 'Dispute regarding the return of a $1,500 security deposit. Tenant claims normal wear and tear and has photo documentation. Landlord claims damages but failed to provide an itemized receipt.',
      legalProvisions: [
        'Civil Code Section 1950.5 (Security Deposit Regulations)',
        'State Fair Housing and Tenant Protection Act'
      ],
      nextAction: 'Monitor the 14-day reply window. If no reply, proceed to prepare Small Claims Court petition.'
    },
    uploadedDoc: {
      name: 'rent_agreement_signed.pdf',
      type: 'application/pdf',
      text: 'Lease Agreement between Landlord Services Inc and John Doe. Deposit: $1500. Property at 104 Park Avenue.',
      analysis: {
        summary: 'Signed Rent Agreement for flat 2B, 104 Park Avenue. Specifies security deposit of $1,500.',
        clauses: [
          { title: 'Security Deposit Clause', explanation: 'Tenant pays $1,500 security deposit to be refunded within 14 days of move-out.', riskLevel: 'Low' },
          { title: 'Notice Period Clause', explanation: 'Either party must give 30 days notice prior to terminating lease.', riskLevel: 'Low' }
        ],
        obligations: [
          'Pay rent monthly by 5th day',
          'Return property in clean condition'
        ],
        deadlines: [
          { date: '14 days post lease termination', action: 'Refund security deposit' }
        ],
        risks: [],
        text: 'Rent Agreement specifying tenancy terms and deposit obligations.',
        entities: {
          names: ['Landlord Services Inc', 'John Doe'],
          dates: ['May 31, 2026'],
          addresses: ['104 Park Avenue'],
          amounts: ['1500'],
          depositValues: ['1500'],
          agreementNumbers: ['L-99218'],
          phoneNumbers: [],
          emailAddresses: []
        },
        detectedDocType: 'Rent Agreement'
      }
    },
    uploadedDocs: [
      {
        id: 'doc-upload-landlord-rent',
        name: 'rent_agreement_signed.pdf',
        type: 'application/pdf',
        text: 'Lease Agreement between Landlord Services Inc and John Doe. Deposit: $1500. Property at 104 Park Avenue.',
        analysis: {
          summary: 'Signed Rent Agreement for flat 2B, 104 Park Avenue. Specifies security deposit of $1,500.',
          clauses: [
            { title: 'Security Deposit Clause', explanation: 'Tenant pays $1,500 security deposit to be refunded within 14 days of move-out.', riskLevel: 'Low' }
          ],
          obligations: [
            'Pay rent monthly by 5th',
            'Return property in clean condition'
          ],
          deadlines: [
            { date: '14 days post lease termination', action: 'Refund security deposit' }
          ],
          risks: [],
          text: 'Rent Agreement specifying tenancy terms and deposit obligations.',
          entities: {
            names: ['Landlord Services Inc', 'John Doe'],
            dates: ['May 31, 2026'],
            addresses: ['104 Park Avenue'],
            amounts: ['1500'],
            depositValues: ['1500'],
            agreementNumbers: ['L-99218'],
            phoneNumbers: [],
            emailAddresses: []
          },
          detectedDocType: 'Rent Agreement'
        }
      },
      {
        id: 'doc-upload-landlord-receipt',
        name: 'deposit_payment_receipt.png',
        type: 'image/png',
        text: 'Payment Confirmation. Amount: $1500 sent to Landlord Services Inc. Transaction ID: TXN-552190A.',
        analysis: {
          summary: 'Receipt confirming $1,500 deposit payment transfer.',
          clauses: [],
          obligations: [],
          deadlines: [],
          risks: [],
          text: 'Bank receipt of $1,500.',
          entities: {
            names: ['Landlord Services Inc', 'John Doe'],
            dates: ['June 10, 2026'],
            addresses: [],
            amounts: ['1500'],
            depositValues: ['1500'],
            agreementNumbers: ['TXN-552190A'],
            phoneNumbers: [],
            emailAddresses: []
          },
          detectedDocType: 'Bank Receipt'
        }
      }
    ]
  },
  {
    id: 'chat-consumer-complaint',
    title: 'Consumer Complaint',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    messages: [
      {
        id: 'msg-consumer-1',
        role: 'user',
        content: 'I bought a premium laptop online for $1,200. It stopped working after 3 days. The seller is refusing a replacement or refund, saying I caused liquid damage, which is false.',
        timestamp: new Date(Date.now() - 3600000 * 24).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'msg-consumer-2',
        role: 'assistant',
        content: 'This falls under Consumer Protection law. A seller is obligated to provide goods that are fit for purpose and of satisfactory quality.\n\nIf a product fails within a short period, it is presumed to have been defective at the time of delivery. Let\'s document the defect and escalate this to the consumer forum if they refuse to cooperate.',
        timestamp: new Date(Date.now() - 3600000 * 24 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    checklist: [
      { id: 'chk-201', label: 'Invoice', checked: true },
      { id: 'chk-202', label: 'Receipt', checked: true },
      { id: 'chk-203', label: 'Screenshots / Visual Evidence', checked: true },
      { id: 'chk-204', label: 'Complaint Communication', checked: true }
    ],
    caseStrength: {
      score: 90,
      riskLevel: 'Strong Case',
      riskFactors: [
        'Receipt matches the full invoice value of $1,200.',
        'Product failure within 3 days is strong evidence of an inherent manufacturing defect.',
        'Seller lacks photo evidence of the alleged liquid damage during inspection.'
      ]
    },
    timeline: [
      {
        id: 't-201',
        title: 'Laptop Purchased',
        date: 'June 01, 2026',
        description: 'Order placed and delivered.',
        status: 'completed'
      },
      {
        id: 't-202',
        title: 'Defect Reported to Support',
        date: 'June 04, 2026',
        description: 'Reported system failure. Support ticket opened.',
        status: 'completed'
      },
      {
        id: 't-203',
        title: 'Support Escalation',
        date: 'June 15, 2026',
        description: 'Seller rejected refund claiming liquid intrusion.',
        status: 'completed'
      },
      {
        id: 't-204',
        title: 'File Consumer Court Complaint',
        date: 'July 05, 2026',
        description: 'File consumer dispute for refund plus compensation.',
        status: 'upcoming'
      }
    ],
    generatedDocs: [
      {
        id: 'doc-2',
        title: 'Consumer Grievance Letter',
        type: 'Complaint',
        date: 'June 12, 2026',
        previewText: 'FORMAL COMPLAINT REGARDING DEFECTIVE GOODS\n\nTo: Zenith Electronics Customer Relations\nRef: Order #ZEN-88219A\n\nDear Sir/Madam,\n\nI am writing to formally log a grievance regarding the Zenith Pro Laptop purchased on June 1, 2026. The device failed completely within 72 hours of operations. Your claims of liquid damage are unsubstantiated and refuted...'
      }
    ],
    summary: {
      overview: 'Consumer purchased a laptop that failed after 3 days. Seller claims liquid damage and refuses refund/replacement. Consumer disputes this claims and requires an independent assessment.',
      legalProvisions: [
        'Consumer Protection Act (Right to Fair Settlement & Refund)',
        'Sales of Goods Act (Implied Conditions of Quality)'
      ],
      nextAction: 'Obtain diagnostic report from certified Apple/Zenith technician to confirm lack of liquid indicators activation.'
    },
    uploadedDoc: {
      name: 'invoice_ZEN_88219A.pdf',
      type: 'application/pdf',
      text: 'Zenith Electronics Invoice. Zenith Pro Laptop. Price: $1200. Order Date: June 1, 2026. Customer: John Doe.',
      analysis: {
        summary: 'Purchase invoice for Zenith Pro Laptop totaling $1,200.',
        clauses: [
          { title: 'Warranty Policy', explanation: 'Manufacturer warranty covers hardware defects for 1 year from purchase.', riskLevel: 'Low' }
        ],
        obligations: [
          'Report manufacturing defect within 30 days'
        ],
        deadlines: [
          { date: '1 year from purchase', action: 'Warranty claim expiration' }
        ],
        risks: [],
        text: 'Invoice confirming transaction of laptop purchase.',
        entities: {
          names: ['Zenith Electronics', 'John Doe'],
          dates: ['June 1, 2026'],
          addresses: [],
          amounts: ['1200'],
          depositValues: [],
          agreementNumbers: ['ZEN-88219A'],
          phoneNumbers: [],
          emailAddresses: []
        },
        detectedDocType: 'Invoice'
      }
    },
    uploadedDocs: [
      {
        id: 'doc-upload-consumer-invoice',
        name: 'invoice_ZEN_88219A.pdf',
        type: 'application/pdf',
        text: 'Zenith Electronics Invoice. Zenith Pro Laptop. Price: $1200. Order Date: June 1, 2026. Customer: John Doe.',
        analysis: {
          summary: 'Purchase invoice for Zenith Pro Laptop totaling $1,200.',
          clauses: [
            { title: 'Warranty Policy', explanation: 'Manufacturer warranty covers hardware defects for 1 year from purchase.', riskLevel: 'Low' }
          ],
          obligations: [
            'Report manufacturing defect within 30 days'
          ],
          deadlines: [
            { date: '1 year from purchase', action: 'Warranty claim expiration' }
          ],
          risks: [],
          text: 'Invoice confirming transaction of laptop purchase.',
          entities: {
            names: ['Zenith Electronics', 'John Doe'],
            dates: ['June 1, 2026'],
            addresses: [],
            amounts: ['1200'],
            depositValues: [],
            agreementNumbers: ['ZEN-88219A'],
            phoneNumbers: [],
            emailAddresses: []
          },
          detectedDocType: 'Invoice'
        }
      },
      {
        id: 'doc-upload-consumer-email',
        name: 'email_support_rejection.pdf',
        type: 'application/pdf',
        text: 'From: support@zenith.com. Subject: Re: Refund Request. Hello John, our service center claims liquid exposure was detected. Hence refund is rejected.',
        analysis: {
          summary: 'Email from Zenith support rejecting refund request due to alleged liquid intrusion.',
          clauses: [],
          obligations: [],
          deadlines: [],
          risks: ['Liquid exposure disclaimer shifts liability to the customer.'],
          text: 'Email thread showing ticket closure.',
          entities: {
            names: ['Zenith Support', 'John Doe'],
            dates: ['June 4, 2026'],
            addresses: [],
            amounts: [],
            depositValues: [],
            agreementNumbers: [],
            phoneNumbers: [],
            emailAddresses: ['support@zenith.com']
          },
          detectedDocType: 'Email'
        }
      }
    ]
  },
  {
    id: 'chat-cyber-fraud',
    title: 'Cyber Fraud Case',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    messages: [
      {
        id: 'msg-cyber-1',
        role: 'user',
        content: 'I received a phone call from someone pretending to be my bank. They said my account was blocked and asked for an OTP. I shared it, and immediately $800 was debited. What should I do?',
        timestamp: new Date(Date.now() - 3600000 * 24 * 3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'msg-cyber-2',
        role: 'assistant',
        content: 'This is a classic social engineering and UPI/Phishing fraud. In cases of unauthorized electronic transactions, immediate action is critical.\n\nUnder banking regulations, notifying the bank within 3 days of the fraud limits your liability to zero in many jurisdictions. We must immediately report this to the cyber police cell and freeze the recipient\'s bank account.',
        timestamp: new Date(Date.now() - 3600000 * 24 * 3 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    checklist: [
      { id: 'chk-301', label: 'FIR', checked: true },
      { id: 'chk-302', label: 'Transaction Records', checked: true },
      { id: 'chk-303', label: 'Chat Logs', checked: true },
      { id: 'chk-304', label: 'Screenshots', checked: true }
    ],
    caseStrength: {
      score: 95,
      riskLevel: 'Strong Case',
      riskFactors: [
        'Transaction records containing precise transaction ID was submitted.',
        'Quick reporting (within 24 hours) preserves the bank\'s obligation to block downstream accounts.',
        'Target fraud account details have been successfully captured and reported.'
      ]
    },
    timeline: [
      {
        id: 't-301',
        title: 'Fraud Event Happened',
        date: 'June 18, 2026',
        description: '$800 transferred out of bank account via phishing call.',
        status: 'completed'
      },
      {
        id: 't-302',
        title: 'Bank Notified & Card Frozen',
        date: 'June 18, 2026',
        description: 'Immediately reported transaction to Bank Fraud Department.',
        status: 'completed'
      },
      {
        id: 't-303',
        title: 'Cyber Police Complaint filing',
        date: 'June 19, 2026',
        description: 'Filed cyber cell complaint and received acknowledgement receipt.',
        status: 'completed'
      },
      {
        id: 't-304',
        title: 'Ombudsman Dispute Submission',
        date: 'July 10, 2026',
        description: 'File dispute with Banking Ombudsman for customer liability protection.',
        status: 'upcoming'
      }
    ],
    generatedDocs: [
      {
        id: 'doc-3',
        title: 'Cyber Crime FIR Template',
        type: 'Notice',
        date: 'June 19, 2026',
        previewText: 'CYBER CELL CRIMINAL WRITTEN COMPLAINT\n\nTo: Superintendent of Cyber Crime Cell\nSubject: Reporting of Phishing and Electronic Funds Theft\n\nI, the undersigned, wish to report a cyber fraud event that occurred on June 18, 2026. The offender used social engineering call (+1 445-921-992) to deceive and unauthorizedly debit $800...'
      }
    ],
    summary: {
      overview: 'Phishing victim lost $800 after disclosing an OTP to a caller masquerading as a bank representative. Immediate bank notification is done; police FIR is being filed.',
      legalProvisions: [
        'Information Technology Act (Section 66D - Cheating by Personation)',
        'Central Bank Circular on Customer Protection for Cyber Fraud'
      ],
      nextAction: 'File the formal FIR at the local cyber cell and submit the copy to the bank\'s fraud prevention division.'
    },
    uploadedDoc: {
      name: 'cyber_complaint_receipt.pdf',
      type: 'application/pdf',
      text: 'National Cyber Crime Reporting Portal. Acknowledgement Slip: 2026/CYBER-88910. Amount: $800. Suspect UPI ID: scammer@upi.',
      analysis: {
        summary: 'Formal Cyber Complaint Acknowledgement slip from National Cyber Crime Portal.',
        clauses: [],
        obligations: [
          'Submit receipt copy to your bank branch within 72 hours'
        ],
        deadlines: [
          { date: '72 hours post incident', action: 'Submit police acknowledgement to bank branch' }
        ],
        risks: [],
        text: 'Cyber crime portal filing confirmation receipt.',
        entities: {
          names: ['National Cyber Crime Portal', 'John Doe'],
          dates: ['June 19, 2026'],
          addresses: [],
          amounts: ['800'],
          depositValues: [],
          agreementNumbers: ['2026/CYBER-88910'],
          phoneNumbers: [],
          emailAddresses: []
        },
        detectedDocType: 'FIR'
      }
    },
    uploadedDocs: [
      {
        id: 'doc-upload-cyber-fir',
        name: 'cyber_complaint_receipt.pdf',
        type: 'application/pdf',
        text: 'National Cyber Crime Reporting Portal. Acknowledgement Slip: 2026/CYBER-88910. Amount: $800. Suspect UPI ID: scammer@upi.',
        analysis: {
          summary: 'Formal Cyber Complaint Acknowledgement slip from National Cyber Crime Portal.',
          clauses: [],
          obligations: [
            'Submit receipt copy to your bank branch within 72 hours'
          ],
          deadlines: [
            { date: '72 hours post incident', action: 'Submit police acknowledgement to bank branch' }
          ],
          risks: [],
          text: 'Cyber crime portal filing confirmation receipt.',
          entities: {
            names: ['National Cyber Crime Portal', 'John Doe'],
            dates: ['June 19, 2026'],
            addresses: [],
            amounts: ['800'],
            depositValues: [],
            agreementNumbers: ['2026/CYBER-88910'],
            phoneNumbers: [],
            emailAddresses: []
          },
          detectedDocType: 'FIR'
        }
      },
      {
        id: 'doc-upload-cyber-statement',
        name: 'bank_statement_debit.png',
        type: 'image/png',
        text: 'Federal Bank Statement. Debit: $800 on 18-06-2026. Ref: IMPS-66210A.',
        analysis: {
          summary: 'Bank transaction proof confirming IMPS debit of $800.',
          clauses: [],
          obligations: [],
          deadlines: [],
          risks: [],
          text: 'Bank statement snapshot.',
          entities: {
            names: ['Federal Bank', 'John Doe'],
            dates: ['June 18, 2026'],
            addresses: [],
            amounts: ['800'],
            depositValues: [],
            agreementNumbers: ['IMPS-66210A'],
            phoneNumbers: [],
            emailAddresses: []
          },
          detectedDocType: 'Bank Statement'
        }
      }
    ]
  },
  {
    id: 'chat-employment-dispute',
    title: 'Employment Dispute',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(), // 7 days ago
    messages: [
      {
        id: 'msg-employment-1',
        role: 'user',
        content: 'I was terminated from my job yesterday without any notice or severance pay. I worked there for 2 years as a software engineer. They said it\'s \'restructuring\', but they just hired someone else for my role.',
        timestamp: new Date(Date.now() - 3600000 * 24 * 7).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: 'msg-employment-2',
        role: 'assistant',
        content: 'This appears to be a potential wrongful termination. If your employment agreement specifies a notice period or severance terms, the employer is legally bound to fulfill them.\n\nFurthermore, firing you under the guise of restructuring and immediately replacing you suggests bad faith. Let\'s analyze your employment contract.',
        timestamp: new Date(Date.now() - 3600000 * 24 * 7 + 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ],
    checklist: [
      { id: 'chk-401', label: 'Employment Offer Letter', checked: true },
      { id: 'chk-402', label: 'Salary Slips', checked: true },
      { id: 'chk-403', label: 'HR Emails', checked: true },
      { id: 'chk-404', label: 'Discharge / Handover Proof', checked: true }
    ],
    caseStrength: {
      score: 95,
      riskLevel: 'Strong Case',
      riskFactors: [
        'Employment contract explicitly details a 60-day mandatory notice period.',
        'Hiring a replacement for the same role undermines the restructuring defense.',
        'Clean performance review history leaves no ground for termination for cause.'
      ]
    },
    timeline: [
      {
        id: 't-401',
        title: 'Terminated from Position',
        date: 'June 14, 2026',
        description: 'Informed of immediate termination under restructuring.',
        status: 'completed'
      },
      {
        id: 't-402',
        title: 'Review of Employment Agreement',
        date: 'June 15, 2026',
        description: 'Analyzed notice periods, severance rules, and non-disclosure duties.',
        status: 'completed'
      },
      {
        id: 't-403',
        title: 'Contact HR & Request Explanation',
        date: 'June 20, 2026',
        description: 'Sent wrongful termination warning notice demanding 60-day severance.',
        status: 'completed'
      },
      {
        id: 't-404',
        title: 'Labor Relations Dispute Filing',
        date: 'July 15, 2026',
        description: 'File wrongful termination suit with State Labor Relations Board.',
        status: 'upcoming'
      }
    ],
    generatedDocs: [
      {
        id: 'doc-4',
        title: 'Severance Demand & Dispute Notice',
        type: 'Notice',
        date: 'June 16, 2026',
        previewText: 'RE: CLAIM FOR WRONGFUL DISMISSAL AND UNPAID SEVERANCE\n\nDear Human Resources Department,\n\nI am writing in reference to the termination of my employment on June 14, 2026. The abrupt termination under the claim of organizational restructuring, followed immediately by hiring actions for the identical role, constitutes breach of the notice and good faith provisions of my employment agreement dated March 14, 2024...'
      }
    ],
    summary: {
      overview: 'Software engineer terminated after 2 years without notice or severance under the pretext of restructuring. Employer hired a replacement shortly after, indicating wrongful dismissal.',
      legalProvisions: [
        'Fair Labor Practices (Severance Entitlements)',
        'Contract Law (Breach of Agreed Notice Period)'
      ],
      nextAction: 'Draft a formal letter to HR requesting formal reasons for termination and demanding the contractual 30-day severance package.'
    },
    uploadedDoc: {
      name: 'employment_agreement_signed.pdf',
      type: 'application/pdf',
      text: 'Employment Agreement between TechSolutions Inc and John Doe. Salary: $6,000/month. Notice period: 60 days.',
      analysis: {
        summary: 'Signed employment contract specifying tech engineer terms and a 60-day notice clause.',
        clauses: [
          { title: 'Notice Period Clause', explanation: 'TechSolutions Inc must provide 60 days written notice or pay in lieu of notice for termination without cause.', riskLevel: 'Low' }
        ],
        obligations: [
          'Maintain confidentiality of company intellectual property'
        ],
        deadlines: [
          { date: '60 days post termination notice', action: 'Severance disbursement' }
        ],
        risks: [],
        text: 'Employment contract stating rights, duties, and severance pay terms.',
        entities: {
          names: ['TechSolutions Inc', 'John Doe'],
          dates: ['March 14, 2024'],
          addresses: [],
          amounts: ['6000'],
          depositValues: [],
          agreementNumbers: [],
          phoneNumbers: [],
          emailAddresses: []
        },
        detectedDocType: 'Employment Contract'
      }
    },
    uploadedDocs: [
      {
        id: 'doc-upload-employment-contract',
        name: 'employment_agreement_signed.pdf',
        type: 'application/pdf',
        text: 'Employment Agreement between TechSolutions Inc and John Doe. Salary: $6,000/month. Notice period: 60 days.',
        analysis: {
          summary: 'Signed employment contract specifying tech engineer terms and a 60-day notice clause.',
          clauses: [
            { title: 'Notice Period Clause', explanation: 'TechSolutions Inc must provide 60 days written notice or pay in lieu of notice for termination without cause.', riskLevel: 'Low' }
          ],
          obligations: [
            'Maintain confidentiality of company intellectual property'
          ],
          deadlines: [
            { date: '60 days post termination notice', action: 'Severance disbursement' }
          ],
          risks: [],
          text: 'Employment contract stating rights, duties, and severance pay terms.',
          entities: {
            names: ['TechSolutions Inc', 'John Doe'],
            dates: ['March 14, 2024'],
            addresses: [],
            amounts: ['6000'],
            depositValues: [],
            agreementNumbers: [],
            phoneNumbers: [],
            emailAddresses: []
          },
          detectedDocType: 'Employment Contract'
        }
      },
      {
        id: 'doc-upload-employment-email',
        name: 'termination_notice_hr.pdf',
        type: 'application/pdf',
        text: 'Subject: Notice of Organizational Restructuring. From: TechSolutions HR. Hi John, due to restructuring we regret to terminate you immediately.',
        analysis: {
          summary: 'HR termination notice stating immediate termination due to restructuring.',
          clauses: [],
          obligations: [],
          deadlines: [],
          risks: ['Employer is attempting to bypass notice pay via immediate exit.'],
          text: 'Termination notification.',
          entities: {
            names: ['TechSolutions HR', 'John Doe'],
            dates: ['June 14, 2026'],
            addresses: [],
            amounts: [],
            depositValues: [],
            agreementNumbers: [],
            phoneNumbers: [],
            emailAddresses: []
          },
          detectedDocType: 'Email'
        }
      }
    ]
  }
];

export const MOCK_RESPONSES: { [key: string]: { text: string; checklistUpdates?: Partial<Chat> } } = {
  default: {
    text: "I have registered your input. Let me analyze this information in relation to standard legal procedures. I've updated your legal toolkit, including case strength factors, evidence items checklist, and the action timeline. Let me know if you would like me to draft a legal demand notice for this."
  },
  landlord: {
    text: "That is helpful clarification. Based on standard residential leasing codes:\n\n1. If a landlord fails to return the deposit or provide an itemized list within the legal period, they may forfeit all rights to retain any portion of the deposit.\n2. In some states, bad faith retention of a security deposit makes the landlord liable for up to three times the amount of the deposit (treble damages) plus reasonable attorney's fees.\n\nI have updated the **Case Strength Card** to reflect this. I have also prepared a formal **Demand Notice** template under the Generated Documents tab. You can preview it to review the legal terminology."
  },
  consumer: {
    text: "Under the Consumer Protection Act, if a product fails within days of purchase, it constitutes an 'inherent defect.' This shifts the onus onto the retailer to prove the device was damaged by you, rather than being defective at assembly.\n\nI recommend we request a formal diagnosis from an independent repair center. If the report states 'no trace of liquid intrusion,' the seller will be forced to refund or face legal actions. I've updated the checklist to include obtaining this report."
  },
  cyber: {
    text: "Social engineering and OTP phishing schemes are subject to strict financial regulatory protections. Under banking liability guidelines, if you notify your bank of an unauthorized transaction immediately, the bank is legally obligated to attempt chargeback and block recipient accounts.\n\nWe need to follow up on the Cyber Police FIR. Once we have the FIR number, the bank must proceed with your liability investigation. I have drafted the **Cyber Crime FIR Template** under your generated documents card."
  },
  employment: {
    text: "Immediate termination without notice or pay-in-lieu is a clear breach of contract unless it is 'for cause' (such as gross misconduct). Since your performance reviews are clean, the 'restructuring' excuse combined with immediate rehiring forms a strong wrongful termination argument.\n\nI have updated your action timeline to include sending a formal notice to the HR department demanding your contractual severance and warning them of wrongful dismissal claims."
  }
};
