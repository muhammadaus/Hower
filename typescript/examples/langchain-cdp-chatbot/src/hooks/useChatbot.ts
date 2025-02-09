'use client';

import { useState, useEffect } from 'react';
import { initializeAgent } from '@/services/chatbot';
import { StorageService } from '@/lib/storage';
import { TaxiService } from '@/services/taxiService';

export function useChatbot() {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_history');
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleScheduleConflict = (newEvent: TimeBlock, existingEvents: TimeBlock[]) => {
    console.log('Checking conflicts for new event:', {
      title: newEvent.title,
      start: newEvent.startTime,
      priority: newEvent.priority
    });
    console.log('Existing events:', existingEvents);

    // Sort existing events by priority
    const priorityOrder = {
      'urgent-important': 3,
      'important': 2,
      'urgent': 1,
      'neither': 0
    };

    // Find conflicting events
    const conflicts = existingEvents.filter(event => {
      const newStart = new Date(newEvent.startTime);
      const newEnd = new Date(newEvent.endTime);
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      const hasConflict = (
        (newStart >= eventStart && newStart < eventEnd) ||
        (newEnd > eventStart && newEnd <= eventEnd) ||
        (newStart <= eventStart && newEnd >= eventEnd)
      );

      if (hasConflict) {
        console.log('Found conflict:', {
          existingEvent: event.title,
          existingPriority: event.priority,
          newEvent: newEvent.title,
          newPriority: newEvent.priority
        });
      }
      
      return hasConflict;
    });

    if (conflicts.length === 0) {
      console.log('No conflicts found');
      return newEvent;
    }

    // Check if new event has higher priority
    const newPriorityScore = priorityOrder[newEvent.priority];
    const highestConflictScore = Math.max(
      ...conflicts.map(e => priorityOrder[e.priority])
    );

    console.log('Priority comparison:', {
      newEventScore: newPriorityScore,
      highestConflictScore,
      willRescheduleConflicts: newPriorityScore > highestConflictScore
    });

    if (newPriorityScore > highestConflictScore) {
      // Move conflicting events
      console.log('Moving conflicting events...');
      const storage = StorageService.getInstance();
      conflicts.forEach(conflict => {
        // Move to next available time
        const duration = new Date(conflict.endTime).getTime() - new Date(conflict.startTime).getTime();
        const newStartTime = new Date(newEvent.endTime);
        const newEndTime = new Date(newStartTime.getTime() + duration);
        
        const updatedEvent = {
          ...conflict,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString()
        };
        
        console.log('Moving event:', {
          event: conflict.title,
          from: conflict.startTime,
          to: updatedEvent.startTime
        });
        
        storage.updateTimeBlock(updatedEvent);
      });
      return newEvent;
    } else {
      // Find next available time for new event
      console.log('Finding next available time for new event...');
      const duration = new Date(newEvent.endTime).getTime() - new Date(newEvent.startTime).getTime();
      const lastConflict = conflicts.sort((a, b) => 
        new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
      )[0];
      
      const newStartTime = new Date(lastConflict.endTime);
      const newEndTime = new Date(newStartTime.getTime() + duration);
      
      const rescheduledEvent = {
        ...newEvent,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString()
      };

      console.log('Rescheduled new event:', {
        from: newEvent.startTime,
        to: rescheduledEvent.startTime
      });
      
      return rescheduledEvent;
    }
  };

  const parseTimeString = (timeStr: string): Date => {
    // Try ISO format first
    let date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try parsing human-readable time formats
    const today = new Date();
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/;
    const match = timeStr.match(timeRegex);
    
    if (match) {
      let [_, hours, minutes, meridiem] = match;
      let hour = parseInt(hours);
      
      // Convert to 24-hour format if meridiem is provided
      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hour < 12) hour += 12;
        if (meridiem.toUpperCase() === 'AM' && hour === 12) hour = 0;
      }
      
      date = new Date(today);
      date.setHours(hour, parseInt(minutes), 0, 0);
      return date;
    }

    throw new Error(`Unable to parse time: ${timeStr}`);
  };

  const parseDate = (dateStr: string) => {
    try {
      // If it's just a time string, parse it as time
      if (dateStr.match(/^\d{1,2}:\d{2}(\s*[AaPp][Mm])?$/)) {
        return parseTimeString(dateStr);
      }

      // Try parsing as full date
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }

      throw new Error(`Invalid date: ${dateStr}`);
    } catch (error) {
      console.error('Date parsing error:', error);
      throw new Error(`Invalid date format: ${dateStr}`);
    }
  };

  const sendMessage = async (content: string) => {
    console.log('=== START sendMessage ===');
    setIsLoading(true);

    try {
      // Initialize agent
      console.log('Initializing agent...');
      const { agent, prompt, functionHandlers } = await initializeAgent();
      console.log('Agent initialized successfully');

      // Format the prompt
      const formattedPrompt = await prompt.formatMessages({
        input: content
      });

      // Call agent
      console.log('Calling agent...');
      const response = await agent.invoke(formattedPrompt);
      console.log('Agent response received:', response);

      // Extract content
      let messageContent = response.content;

      // Look for schedule task
      const codeBlockMatch = messageContent.match(/```[\s\S]*?schedule_task\(([\s\S]*?)\)[\s\S]*?```/);
      if (codeBlockMatch) {
        const paramsText = codeBlockMatch[1];
        const params = {
          title: (paramsText.match(/title="([^"]+)"/) || [])[1],
          startTime: (paramsText.match(/startTime="([^"]+)"/) || [])[1],
          endTime: (paramsText.match(/endTime="([^"]+)"/) || [])[1],
          priority: (paramsText.match(/priority="([^"]+)"/) || [])[1],
          location: (paramsText.match(/location="([^"]+)"/) || [])[1],
          needsTransport: paramsText.includes('needsTransport=True'),
          delegatable: paramsText.includes('delegatable=True')
        };

        if (params.title && params.startTime) {
          // Validate and parse dates
          const startTime = parseDate(params.startTime);
          const endTime = params.endTime ? parseDate(params.endTime) : 
            new Date(startTime.getTime() + 60 * 60 * 1000);

          const storage = StorageService.getInstance();
          const existingEvents = storage.getTimeBlocks();
          
          // Handle transportation if needed
          if (params.needsTransport && params.location) {
            const taxiService = TaxiService.getInstance();
            const estimate = await taxiService.estimateTrip('current_location', params.location);
            
            if (estimate.available) {
              try {
                // Add buffer time for transportation
                const pickupTime = new Date(startTime.getTime());
                pickupTime.setMinutes(pickupTime.getMinutes() - estimate.duration);
                
                // Process payment first - this actually sends ETH
                console.log('Processing taxi payment...');
                const paymentDetails = await taxiService.getPaymentDetails('current_location', params.location);
                
                if (!paymentDetails.txHash) {
                  throw new Error('Failed to process payment');
                }

                console.log('Payment processed:', paymentDetails);
                
                // Wait for confirmation
                const isConfirmed = await taxiService.verifyPayment(paymentDetails.txHash);
                const paymentStatus = isConfirmed ? 'Confirmed' : 'Failed';
                
                if (!isConfirmed) {
                  throw new Error('Payment failed to confirm');
                }

                const scheduledEvent = {
                  _id: crypto.randomUUID(),
                  title: params.title,
                  startTime: pickupTime.toISOString(),
                  endTime: endTime.toISOString(),
                  priority: params.priority || "important",
                  location: params.location,
                  transportDetails: {
                    pickupTime: pickupTime.toISOString(),
                    paymentHash: paymentDetails.txHash,
                    paymentStatus
                  },
                  delegatable: params.delegatable || false,
                  status: 'scheduled',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };

                messageContent = `📅 Event Scheduled: ${params.title}
⏰ Time: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}
📍 Location: ${params.location}
🚕 Transport: Taxi booked for ${pickupTime.toLocaleTimeString()}
💰 Payment: ${paymentStatus}
💳 Transaction: ${paymentDetails.txHash}`;

                const finalEvent = handleScheduleConflict(scheduledEvent, existingEvents);
                storage.addTimeBlock(finalEvent);

                const event = new CustomEvent('calendarUpdate', {
                  detail: finalEvent
                });
                window.dispatchEvent(event);
              } catch (error) {
                console.error('Failed to process taxi payment:', error);
                messageContent = `❌ Failed to schedule event: ${error.message}`;
              }
            }
          }
        }
      }

      // Add message to chat history
      setMessages(prev => [...prev, {
        content: messageContent,
        role: 'assistant',
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('Error in sendMessage:', error);
      setMessages(prev => [...prev, {
        content: `Error: ${error.message}`,
        role: 'system',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    setMessages,
    isLoading,
    sendMessage
  };
} 